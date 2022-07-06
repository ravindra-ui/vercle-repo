import chalk from 'chalk';
import Client from '../util/client';
import getArgs from '../util/get-args';
import getScope from '../util/get-scope';
import handleError from '../util/handle-error';
import logo from '../util/output/logo';
import { getCommandName, getPkgName } from '../util/pkg-name';
import validatePaths from '../util/validate-paths';
import { ensureLink } from '../util/ensure-link';
import list from '../util/input/list';
import { Org, Project, Team } from '../types';
import { stringify } from 'querystring';
import execa from 'execa';
import link from '../util/output/link';
import { getDeployment } from '../util/get-deployment';
import { normalizeURL } from '../util/normalize-url';

const help = () => {
  console.log(`
  ${chalk.bold(`${logo} ${getPkgName()} open`)} [options]

  ${chalk.dim('Options:')}

    -h, --help                     Output usage information
    --yes                          Skip confirmation prompts
    dash                           Open the dashboard in a browser
    latest                         Open the latest preview deployment URL in a browser
    prod                           Open the latest production deployment URL in a browser
    [url]                          Open the specified deployment URL in a browser
    -A ${chalk.bold.underline('FILE')}, --local-config=${chalk.bold.underline(
    'FILE'
  )}   Path to the local ${'`vercel.json`'} file
    -Q ${chalk.bold.underline('DIR')}, --global-config=${chalk.bold.underline(
    'DIR'
  )}    Path to the global ${'`.vercel`'} directory

  ${chalk.dim('Examples:')}

  ${chalk.gray('–')} View all options

    ${chalk.cyan(`$ ${getPkgName()} open`)}

  ${chalk.gray('–')} Open the dashboard for the current project

    ${chalk.cyan(`$ ${getPkgName()} open dash`)}

  ${chalk.gray('–')} Open the latest preview deployment URL

    ${chalk.cyan(`$ ${getPkgName()} open latest`)}

  ${chalk.gray('–')} Open the latest production deployment URL

    ${chalk.cyan(`$ ${getPkgName()} open prod`)}

  ${chalk.gray('–')} Open the dashboard for the latest preview deployment

    ${chalk.cyan(`$ ${getPkgName()} open dash latest`)}

  ${chalk.gray('–')} Open the dashboard for the latest production deployment

    ${chalk.cyan(`$ ${getPkgName()} open dash prod`)}

  ${chalk.gray('–')} Open a specific deployment URL
  
    ${chalk.cyan(`$ ${getPkgName()} open [url]`)}

  ${chalk.gray('–')} Open the dashboard for a specific deployment
  
    ${chalk.cyan(`$ ${getPkgName()} open dash [url]`)}
`);
};

export default async function open(
  client: Client,
  test: Boolean
): Promise<number> {
  const { output } = client;
  let argv;
  let subcommand: string | string[];
  let narrow: string | string[];

  try {
    argv = getArgs(client.argv.slice(2), {
      '--yes': Boolean,
      '--prod': Boolean,
    });
  } catch (error) {
    handleError(error);
    return 1;
  }

  argv._ = argv._.slice(1);
  subcommand = argv._[0];
  narrow = argv._[1];

  if (argv['--help']) {
    help();
    return 2;
  }

  const yes = argv['--yes'] || false;

  let scope = null;

  try {
    scope = await getScope(client);
  } catch (err) {
    if (err.code === 'NOT_AUTHORIZED' || err.code === 'TEAM_DELETED') {
      output.error(err.message);
      return 1;
    }

    throw err;
  }

  const { team, contextName } = scope;

  let paths = [process.cwd()];

  const validate = await validatePaths(client, paths);
  if (!validate.valid) {
    return validate.exitCode;
  }
  const { path } = validate;

  const linkedProject = await ensureLink('open', client, path, yes);
  if (typeof linkedProject === 'number') {
    return linkedProject;
  }

  const { project, org } = linkedProject;
  client.config.currentTeam = org.type === 'team' ? org.id : undefined;

  const dashboardUrl = getDashboardUrl(org, project);
  const inspectorUrl =
    (await getInspectorUrl(client, project, org, team)) || 'not_found';
  const prodInspectorUrl =
    (await getInspectorUrl(client, project, org, team, true)) || 'not_found';
  const latestDeployment =
    (await getLatestDeploymentUrl(client, project, team)) || 'not_found';
  const latestProdDeployment =
    (await getLatestDeploymentUrl(client, project, team, true)) || 'not_found';

  let choice = '';

  if (subcommand === 'dash') {
    if (narrow === 'latest') {
      choice = inspectorUrl;
    } else if (narrow === 'prod') {
      choice = prodInspectorUrl;
    } else if (narrow) {
      // Assume they're trying to pass in a deployment URL
      const deployment = await verifyDeployment(client, narrow, contextName);
      if (typeof deployment === 'number') {
        return deployment;
      }

      choice = deployment.inspectorUrl;
    } else {
      choice = dashboardUrl;
    }
  } else if (subcommand === 'latest') {
    choice = latestDeployment;
  } else if (subcommand === 'prod') {
    choice = latestProdDeployment;
  } else if (subcommand) {
    // Assume they're trying to pass in a deployment URL
    const deployment = await verifyDeployment(client, subcommand, contextName);
    if (typeof deployment === 'number') {
      return deployment;
    }

    choice = deployment.url;
  } else {
    choice = await list(client, {
      message: 'What do you want to open?',
      choices: [
        {
          name: `Dashboard ${chalk.gray('(vc open dash)')}`,
          value: dashboardUrl,
          short: 'Dashboard',
        },
        {
          name: `Latest Preview Deployment ${chalk.gray('(vc open latest)')}`,
          value: latestDeployment,
          short: 'Latest Preview Deployment',
        },
        {
          name: `Inspect Latest Preview Deployment ${chalk.gray(
            '(vc open dash latest)'
          )}`,
          value: inspectorUrl,
          short: 'Deployment Inspector',
        },
        {
          name: `Latest Production Deployment ${chalk.gray('(vc open prod)')}`,
          value: latestProdDeployment,
          short: 'Latest Production Deployment',
        },
        {
          name: `Inspect Latest Production Deployment ${chalk.gray(
            '(vc open dash prod)'
          )}`,
          value: prodInspectorUrl,
          short: 'Latest Production Deployment Inspector',
        },
      ],
    });
  }

  if (choice === 'not_found') {
    output.log(
      `No deployments found. Run ${chalk.cyan(
        getCommandName('deploy')
      )} to create a deployment.`
    );
    return 1;
  }
  if (choice === '') {
    // User aborted
    return 0;
  }

  if (!test) execa('open', [choice]);
  output.log(`🪄 Opened ${link(choice)}`);
  return 0;
}

async function verifyDeployment(
  client: Client,
  url: string,
  contextName: string
) {
  try {
    const deployment = await getDeployment(client, url);
    return {
      url: normalizeURL(deployment.url),
      inspectorUrl: deployment.inspectorUrl || '',
    };
  } catch (err) {
    if (err.status === 404) {
      client.output.error(
        `Could not find a deployment with URL ${link(url)} in ${contextName}.`
      );
    }
    return 1;
  }
}

function getDashboardUrl(org: Org, project: Project): string {
  return `https://vercel.com/${org.slug}/${project.name}`;
}
async function getInspectorUrl(
  client: Client,
  project: Project,
  org: Org,
  team: Team | null,
  prod: Boolean = false
): Promise<string | undefined> {
  const proj = await getProject(client, project, team);
  if (proj) {
    let latestDeploymentId = (
      prod ? proj?.targets?.production?.id : proj.latestDeployments?.[0]?.id
    )?.replace('dpl_', '');
    if (latestDeploymentId) {
      return `https://vercel.com/${org.slug}/${project.name}/${latestDeploymentId}`;
    }
  }
}
async function getLatestDeploymentUrl(
  client: Client,
  project: Project,
  team: Team | null,
  prod: Boolean = false
): Promise<string | undefined> {
  const proj = await getProject(client, project, team);
  if (prod && proj?.targets?.production) {
    return `https://${proj.targets.production.url}`;
  } else if (proj?.latestDeployments?.[0]?.url) {
    return `https://${proj.latestDeployments[0].url}`;
  }
}

async function getProject(
  client: Client,
  project: Project,
  team: Team | null
): Promise<Project | undefined> {
  const proj = await client
    .fetch(
      `/v9/projects/${project.name}?${stringify({
        teamId: team?.id,
      })}`
    )
    .catch(err => {
      client.output.error(err.message);
      return;
    });
  return proj as Project;
}