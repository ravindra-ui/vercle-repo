# @vercel/edge

## Table of contents

### Interfaces

- [ExtraResponseInit](interfaces/ExtraResponseInit.md)
- [Geo](interfaces/Geo.md)

### Variables

- [CITY_HEADER_NAME](README.md#city_header_name)
- [COUNTRY_HEADER_NAME](README.md#country_header_name)
- [IP_HEADER_NAME](README.md#ip_header_name)
- [LATITUDE_HEADER_NAME](README.md#latitude_header_name)
- [LONGITUDE_HEADER_NAME](README.md#longitude_header_name)
- [REGION_HEADER_NAME](README.md#region_header_name)

### Functions

- [geolocation](README.md#geolocation)
- [ipAddress](README.md#ipaddress)
- [next](README.md#next)
- [rewrite](README.md#rewrite)

## Variables

### CITY_HEADER_NAME

• `Const` **CITY_HEADER_NAME**: `"x-vercel-ip-city"`

City of the original client IP as calculated by Vercel Proxy.

#### Defined in

[src/edge-headers.ts:4](https://github.com/vercel/vercel/blob/main/packages/edge/src/edge-headers.ts#L4)

---

### COUNTRY_HEADER_NAME

• `Const` **COUNTRY_HEADER_NAME**: `"x-vercel-ip-country"`

Country of the original client IP as calculated by Vercel Proxy.

#### Defined in

[src/edge-headers.ts:8](https://github.com/vercel/vercel/blob/main/packages/edge/src/edge-headers.ts#L8)

---

### IP_HEADER_NAME

• `Const` **IP_HEADER_NAME**: `"x-real-ip"`

Client IP as calcualted by Vercel Proxy.

#### Defined in

[src/edge-headers.ts:12](https://github.com/vercel/vercel/blob/main/packages/edge/src/edge-headers.ts#L12)

---

### LATITUDE_HEADER_NAME

• `Const` **LATITUDE_HEADER_NAME**: `"x-vercel-ip-latitude"`

Latitude of the original client IP as calculated by Vercel Proxy.

#### Defined in

[src/edge-headers.ts:16](https://github.com/vercel/vercel/blob/main/packages/edge/src/edge-headers.ts#L16)

---

### LONGITUDE_HEADER_NAME

• `Const` **LONGITUDE_HEADER_NAME**: `"x-vercel-ip-longitude"`

Longitude of the original client IP as calculated by Vercel Proxy.

#### Defined in

[src/edge-headers.ts:20](https://github.com/vercel/vercel/blob/main/packages/edge/src/edge-headers.ts#L20)

---

### REGION_HEADER_NAME

• `Const` **REGION_HEADER_NAME**: `"x-vercel-ip-country-region"`

Region of the original client IP as calculated by Vercel Proxy.

#### Defined in

[src/edge-headers.ts:24](https://github.com/vercel/vercel/blob/main/packages/edge/src/edge-headers.ts#L24)

## Functions

### geolocation

▸ **geolocation**(`request`): [`Geo`](interfaces/Geo.md)

Returns the location information for the incoming request.

**`See`**

- [CITY_HEADER_NAME](README.md#city_header_name)
- [COUNTRY_HEADER_NAME](README.md#country_header_name)
- [REGION_HEADER_NAME](README.md#region_header_name)
- [LATITUDE_HEADER_NAME](README.md#latitude_header_name)
- [LONGITUDE_HEADER_NAME](README.md#longitude_header_name)

#### Parameters

| Name      | Type      | Description                                                     |
| :-------- | :-------- | :-------------------------------------------------------------- |
| `request` | `Request` | The incoming request object which provides the geolocation data |

#### Returns

[`Geo`](interfaces/Geo.md)

#### Defined in

[src/edge-headers.ts:80](https://github.com/vercel/vercel/blob/main/packages/edge/src/edge-headers.ts#L80)

---

### ipAddress

▸ **ipAddress**(`request`): `string` \| `undefined`

Returns the IP address of the request from the headers.

**`See`**

[IP_HEADER_NAME](README.md#ip_header_name)

#### Parameters

| Name      | Type      | Description                                       |
| :-------- | :-------- | :------------------------------------------------ |
| `request` | `Request` | The incoming request object which provides the IP |

#### Returns

`string` \| `undefined`

#### Defined in

[src/edge-headers.ts:66](https://github.com/vercel/vercel/blob/main/packages/edge/src/edge-headers.ts#L66)

---

### next

▸ **next**(`init?`): `Response`

Returns a Response that instructs the system to continue processing the request.

**`Example`**

<caption>No-op middleware</caption>

```ts
import { next } from '@vercel/edge';

export default function middleware(_req: Request) {
  return next();
}
```

**`Example`**

<caption>Add response headers to all requests</caption>

```ts
import { next } from '@vercel/edge';

export default function middleware(_req: Request) {
  return next({
    headers: { 'x-from-middleware': 'true' },
  });
}
```

#### Parameters

| Name    | Type                                                   | Description                         |
| :------ | :----------------------------------------------------- | :---------------------------------- |
| `init?` | [`ExtraResponseInit`](interfaces/ExtraResponseInit.md) | Additional options for the response |

#### Returns

`Response`

#### Defined in

[src/middleware-helpers.ts:94](https://github.com/vercel/vercel/blob/main/packages/edge/src/middleware-helpers.ts#L94)

---

### rewrite

▸ **rewrite**(`destination`, `init?`): `Response`

Returns a response that rewrites the request to a different URL.

**`Example`**

<caption>Rewrite all feature-flagged requests from `/:path*` to `/experimental/:path*`</caption>

```ts
import { rewrite, next } from '@vercel/edge';

export default async function middleware(req: Request) {
  const flagged = await getFlag(req, 'isExperimental');
  if (flagged) {
    const url = new URL(req.url);
    url.pathname = `/experimental{url.pathname}`;
    return rewrite(url);
  }

  return next();
}
```

**`Example`**

<caption>JWT authentication for `/api/:path*` requests</caption>

```ts
import { rewrite, next } from '@vercel/edge';

export default function middleware(req: Request) {
  const auth = checkJwt(req.headers.get('Authorization'));
  if (!checkJwt) {
    return rewrite(new URL('/api/error-unauthorized', req.url));
  }
  const url = new URL(req.url);
  url.searchParams.set('_userId', auth.userId);
  return rewrite(url);
}

export const config = { matcher: '/api/users/:path*' };
```

#### Parameters

| Name          | Type                                                                      | Description                         |
| :------------ | :------------------------------------------------------------------------ | :---------------------------------- |
| `destination` | `string` \| [`URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL) | new URL to rewrite the request to   |
| `init?`       | [`ExtraResponseInit`](interfaces/ExtraResponseInit.md)                    | Additional options for the response |

#### Returns

`Response`

#### Defined in

[src/middleware-helpers.ts:53](https://github.com/vercel/vercel/blob/main/packages/edge/src/middleware-helpers.ts#L53)
