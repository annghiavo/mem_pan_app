# 🚀 Hướng Dẫn Onboarding: Dự Án Mem_Pan Admin Web

> **Dành cho:** Thành viên mới gia nhập dự án
> **Công nghệ chính:** React + TypeScript + React Query + Zustand + Axios
> **Đường dẫn dự án:** `mem_pan_admin/admin-web/`

---

## Mục Lục

1. [Tổng quan luồng hoạt động của dự án](#1-tổng-quan-luồng-hoạt-động-của-dự-án)
2. [Hành trình của dữ liệu: Từ API hiển thị lên màn hình](#2-hành-trình-của-dữ-liệu-từ-api-hiển-thị-lên-màn-hình)
3. [Cẩm nang "Bắt bệnh": Bắt đầu từ đâu khi cần sửa code?](#3-cẩm-nang-bắt-bệnh-bắt-đầu-từ-đâu-khi-cần-sửa-code)

---

## 1. Tổng Quan Luồng Hoạt Động Của Dự Án

### 🧩 React là gì? Giải thích bằng ngôn ngữ đời thường

Hãy hình dung app như một tờ báo giấy — nhưng tờ báo này **tự cập nhật nội dung** mà không cần in lại toàn bộ trang.

| Khái niệm | Ví von thực tế | Trong dự án này |
|---|---|---|
| **Component** | Một "khối" tái sử dụng được — như một widget tin tức có thể đặt nhiều nơi | `Sidebar`, `UserTable`, `BanUserModal` — mỗi file `.tsx` là một component |
| **State** | Bộ nhớ riêng của component — như tờ giấy nháp trên bàn làm việc của bạn | `const [filter, setFilter] = useState("all")` — component nhớ người dùng đang chọn filter gì |
| **Props** | Thông điệp được gửi từ component cha xuống con — như sếp giao nhiệm vụ cho nhân viên | `<UserTable users={data?.users ?? []} onAction={setSelected} />` — page truyền danh sách users xuống bảng |

> **Quy tắc vàng:** State thay đổi → React tự động vẽ lại UI. Bạn không bao giờ phải tự cập nhật DOM.

---

### 📁 Cấu Trúc Thư Mục Thực Tế Của Dự Án

```
mem_pan_admin/admin-web/src/
│
├── main.tsx              ← Điểm khởi động của toàn bộ app
├── App.tsx               ← Nơi khai báo tất cả các Route (đường dẫn URL)
│
├── api/                  ← Mọi lời gọi HTTP đều sống ở đây
│   ├── client.ts         ← Cấu hình Axios gốc (base URL, token, logging)
│   ├── users.ts          ← Các hàm gọi API liên quan đến Users
│   ├── decks.ts          ← Các hàm gọi API liên quan đến Decks
│   ├── appeals.ts        ← API cho Appeals (kháng cáo)
│   ├── reports.ts        ← API cho Reports (báo cáo vi phạm)
│   ├── auth.ts           ← API đăng nhập
│   └── emailTemplates.ts ← API quản lý email
│
├── pages/                ← Mỗi file = một trang lớn (ứng với một URL)
│   ├── LoginPage.tsx     ← /login
│   ├── UsersPage.tsx     ← /users
│   ├── UserDetailPage.tsx← /users/:id
│   ├── DecksPage.tsx     ← /decks
│   ├── DeckDetailPage.tsx← /decks/:id
│   ├── ReportsPage.tsx   ← /reports
│   ├── AppealsPage.tsx   ← /appeals
│   ├── AppealPage.tsx    ← /appeal (không cần đăng nhập)
│   ├── EmailTemplatesPage.tsx ← /email-templates (chỉ admin)
│   └── ModeratorsPage.tsx    ← /moderators (chỉ admin)
│
├── components/           ← Các khối UI nhỏ hơn, được dùng trong Pages
│   ├── layout/
│   │   ├── Sidebar.tsx   ← Thanh điều hướng bên trái (luôn hiển thị)
│   │   └── TopBar.tsx    ← Thanh trên cùng
│   ├── users/
│   │   ├── UserTable.tsx ← Bảng hiển thị danh sách users
│   │   └── BanUserModal.tsx ← Popup ban user
│   ├── decks/            ← Components cho trang Decks
│   ├── appeals/          ← Components cho trang Appeals
│   └── common/           ← Components dùng chung (Button, Badge, v.v.)
│
├── store/
│   └── authStore.ts      ← Lưu token đăng nhập & role (admin/moderator)
│
└── types/
    └── admin.ts          ← Định nghĩa kiểu dữ liệu (User, Deck, Report...)
```

---

### 🔄 Luồng Đi Của Dữ Liệu (Data Flow)

Đây là vòng đời hoàn chỉnh khi người dùng tương tác với app:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Người dùng nhấn nút "Banned"                               │
│       ↓                                                         │
│  2. State thay đổi: setFilter("banned")                        │
│       ↓                                                         │
│  3. React Query phát hiện queryKey đổi → tự động gọi API lại   │
│       ↓                                                         │
│  4. api/users.ts gửi GET /v1/admin/users?filterBanned=true      │
│       ↓ (thông qua api/client.ts — tự đính kèm Bearer token)   │
│  5. Server trả về JSON: { users: [...], nextPageToken: "..." }  │
│       ↓                                                         │
│  6. data được cập nhật → React vẽ lại <UserTable users={...}/> │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Các lớp bảo vệ trong luồng này:**
- **`client.ts` interceptors:** Tự gắn token, tự redirect về `/login` nếu nhận 401/403
- **`authStore.ts`:** Zustand store lưu token vào `localStorage` — không mất khi F5
- **`PrivateRoute` trong `App.tsx`:** Chặn các trang yêu cầu đăng nhập nếu chưa có token
- **`AdminRoute` trong `App.tsx`:** Chặn các trang `/email-templates`, `/moderators` nếu không phải `admin`

---

## 2. Hành Trình Của Dữ Liệu: Từ API Hiển Thị Lên Màn Hình

Hãy theo dõi luồng **thực tế** của tính năng "Danh sách Users" trong dự án này.

---

### Bước 1: Khai báo API — `src/api/users.ts`

Đây là nơi duy nhất bạn viết "tôi muốn gọi endpoint này". Không viết URL rải rác trong components.

```typescript
// src/api/users.ts

import { adminApi } from "./client"; // Import axios instance đã cấu hình sẵn
import type { User } from "../types/admin"; // Định nghĩa kiểu dữ liệu

// Khai báo kiểu tham số đầu vào
export interface ListUsersParams {
  pageSize?: number;
  pageToken?: string;
  filterBanned?: boolean;
}

// Khai báo kiểu dữ liệu trả về
export interface ListUsersResponse {
  users: User[];
  nextPageToken: string;
}

// Hàm gọi API — đơn giản, thuần túy, không có logic UI
export const listUsers = (params: ListUsersParams) =>
  adminApi
    .get<ListUsersResponse>("/v1/admin/users", { params })
    .then((r) => r.data); // Chỉ lấy phần .data từ response của Axios
```

> 💡 **Lưu ý:** `adminApi` được import từ `client.ts`. Nó đã được cấu hình sẵn `baseURL`, `Bearer token`, và logging — bạn không cần lo về những thứ đó.

---

### Bước 2: Gọi API trong Component — `src/pages/UsersPage.tsx`

Dự án dùng **React Query** (`@tanstack/react-query`) thay vì `useEffect` thông thường. React Query quản lý loading/error/caching tự động.

```typescript
// src/pages/UsersPage.tsx (trích đoạn)

import { useState } from "react";
import { useQuery } from "@tanstack/react-query"; // ← Hook chính
import { listUsers } from "../api/users";          // ← Hàm API ở bước 1

export default function UsersPage() {
  // State để lưu bộ lọc hiện tại
  const [filter, setFilter] = useState<"all" | "active" | "banned">("all");
  const [pageToken, setPageToken] = useState("");

  // Chuyển đổi filter thành tham số API
  const filterBanned = filter === "all" ? undefined : filter === "banned";

  // 🔑 React Query tự động gọi API, quản lý loading/error, và cache kết quả
  const { data, isLoading, isError } = useQuery({
    // queryKey: "tên cache" — khi key thay đổi, React Query tự gọi lại API
    queryKey: ["users", filter, pageToken],
    // queryFn: hàm thực sự thực hiện việc gọi API
    queryFn: () => listUsers({ pageSize: 20, pageToken, filterBanned }),
  });

  // ... phần JSX render bên dưới
}
```

**Tại sao dùng React Query thay vì `useEffect`?**

| Tính năng | `useEffect` thủ công | React Query |
|---|---|---|
| Quản lý `isLoading` | Tự viết `useState` | ✅ Tự động |
| Quản lý `isError` | Tự viết `try/catch` | ✅ Tự động |
| Cache kết quả | Không có | ✅ Tự động |
| Gọi lại khi params đổi | Phải tự thêm dependency | ✅ Qua `queryKey` |

---

### Bước 3: Lưu trữ (State) và truyền dữ liệu (Props)

Dữ liệu sau khi lấy về được lưu trong `data` (do React Query quản lý). Sau đó được **truyền xuống** component con qua **Props**:

```typescript
// UsersPage.tsx truyền data xuống UserTable
<UserTable
  users={data?.users ?? []}  // ← Prop "users": mảng user, mặc định là [] nếu chưa có
  onAction={setSelected}     // ← Prop "onAction": hàm callback để UserTable gọi lên
/>
```

```typescript
// src/components/users/UserTable.tsx nhận props
interface UserTableProps {
  users: User[];              // Nhận mảng user từ page cha
  onAction: (user: User) => void; // Nhận hàm để "báo lại" cho page cha
}

export default function UserTable({ users, onAction }: UserTableProps) {
  // Dùng `users` để render, `onAction` để xử lý sự kiện
}
```

> 💡 **Quy tắc luồng dữ liệu:** Dữ liệu chỉ đi **một chiều từ trên xuống** (Parent → Child qua Props). Muốn con thông báo lại cho cha, dùng **hàm callback** (như `onAction`).

---

### Bước 4: Render dữ liệu ra giao diện — JSX

```typescript
// src/pages/UsersPage.tsx — phần render hoàn chỉnh

return (
  <div>
    {/* ---- Xử lý trạng thái lỗi ---- */}
    {isError ? (
      <div style={{ color: "red" }}>
        ⚠️ Failed to load users. Check your connection or login status.
      </div>

    /* ---- Xử lý trạng thái đang tải ---- */
    ) : isLoading ? (
      <div>Loading users...</div>

    /* ---- Dữ liệu đã sẵn sàng ---- */
    ) : (
      <>
        {/* Truyền data xuống component con */}
        <UserTable users={data?.users ?? []} onAction={setSelected} />

        {/* Nút "Tải thêm" — chỉ hiện khi còn trang tiếp theo */}
        {data?.nextPageToken && (
          <button onClick={() => setPageToken(data.nextPageToken)}>
            Load Next Page
          </button>
        )}
      </>
    )}

    {/* Modal Ban User — chỉ render khi có user được chọn */}
    {selected && <BanUserModal user={selected} onClose={() => setSelected(null)} />}
  </div>
);
```

---

### 📦 Ví dụ hoàn chỉnh từ đầu đến cuối (Snippet tự học)

Dưới đây là một ví dụ tổng hợp **đơn giản hóa** (không cần copy vào dự án, chỉ để học):

```tsx
// ========================================================
// Bước 1: src/api/products.ts — Khai báo API
// ========================================================
import { adminApi } from "./client";

export interface Product { id: string; name: string; price: number; }

export const listProducts = () =>
  adminApi.get<Product[]>("/v1/products").then((r) => r.data);


// ========================================================
// Bước 2, 3, 4: src/pages/ProductsPage.tsx — Gọi, lưu, render
// ========================================================
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "../api/products";

export default function ProductsPage() {
  // Bước 2: Gọi API
  const { data, isLoading, isError } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

  // Bước 4: Render
  if (isLoading) return <p>Đang tải...</p>;
  if (isError)   return <p style={{ color: "red" }}>Có lỗi xảy ra!</p>;

  return (
    <ul>
      {/* Bước 3 + 4: data từ API, map ra danh sách */}
      {data?.map((product) => (
        <li key={product.id}>
          {product.name} — {product.price.toLocaleString("vi-VN")}đ
        </li>
      ))}
    </ul>
  );
}
```

---

## 3. Cẩm Nang "Bắt Bệnh": Bắt Đầu Từ Đâu Khi Cần Sửa Code?

Đây là quy trình **5 bước** để đi từ yêu cầu của khách hàng đến đúng dòng code cần sửa.

---

### 🗺️ Bước 1: Từ URL → Tìm đúng file Page

**Nguyên tắc:** URL trên trình duyệt ánh xạ 1-1 với các `<Route>` trong `App.tsx`.

**Mở file `src/App.tsx`** và tìm kiếm:

```tsx
// App.tsx — Bản đồ toàn bộ dự án
<Route path="/users"       element={<UsersPage />} />
<Route path="/users/:id"   element={<UserDetailPage />} />
<Route path="/decks"       element={<DecksPage />} />
<Route path="/decks/:id"   element={<DeckDetailPage />} />
<Route path="/reports"     element={<ReportsPage />} />
<Route path="/appeals"     element={<AppealsPage />} />
<Route path="/appeal"      element={<AppealPage />} />       // Không cần login
<Route path="/email-templates" element={<EmailTemplatesPage />} />
<Route path="/moderators"  element={<ModeratorsPage />} />
```

**Ví dụ thực tế:**
- Khách hàng nói: *"Trang danh sách users bị lỗi"*
- URL là: `https://admin.mempan.com/users`
- → Tìm `path="/users"` → File cần sửa: **`src/pages/UsersPage.tsx`** ✅

---

### 🔍 Bước 2: Từ Page → Thu hẹp xuống Component con

Khi đã vào đúng Page, xem nó **render những component nào**:

```tsx
// UsersPage.tsx — Các component con được sử dụng
import UserTable from "../components/users/UserTable";     // Bảng dữ liệu
import BanUserModal from "../components/users/BanUserModal"; // Modal ban

// Trong JSX:
<UserTable users={data?.users ?? []} onAction={setSelected} />
{selected && <BanUserModal user={selected} onClose={...} />}
```

**Kỹ thuật thu hẹp:**
- Lỗi hiển thị ở **bảng dữ liệu**? → Vào `UserTable.tsx`
- Lỗi ở **popup/modal**? → Vào `BanUserModal.tsx`
- Lỗi ở **dữ liệu không load được**? → Kiểm tra `useQuery` và file `api/users.ts`

---

### 🖱️ Bước 3: Từ nút bấm → Tìm hàm logic và API

**Quy trình dò ngược từ UI:**

```
[Nút bấm trên UI]
      ↓ onClick={...}
[Hàm xử lý trong Component]  ←── Thường là setFilter(), navigate(), hoặc mutation
      ↓ (nếu cần gọi server)
[useMutation hoặc hàm async]
      ↓ gọi hàm từ api/*.ts
[Hàm trong src/api/]          ←── Đây là nơi có endpoint thực sự
      ↓
[HTTP Request đến Server]
```

**Ví dụ thực tế — nút "Load Next Page" trong `UsersPage.tsx`:**

```tsx
// 1. Tìm nút trong JSX
<button onClick={() => setPageToken(data.nextPageToken)}>
  Load Next Page
</button>

// 2. setPageToken thay đổi state → queryKey thay đổi
const [pageToken, setPageToken] = useState("");

// 3. React Query tự động gọi lại API với pageToken mới
const { data } = useQuery({
  queryKey: ["users", filter, pageToken], // ← pageToken nằm ở đây
  queryFn: () => listUsers({ pageSize: 20, pageToken, filterBanned }),
});

// 4. Tìm trong api/users.ts
export const listUsers = (params: ListUsersParams) =>
  adminApi.get<ListUsersResponse>("/v1/admin/users", { params }); // ← Endpoint!
```

---

### 🔎 Bước 4: Dùng VS Code Search để tìm nhanh

**Phím tắt:** `Cmd + Shift + F` (Mac) → Tìm toàn dự án

| Bạn muốn tìm | Từ khóa search |
|---|---|
| Trang xử lý URL `/reports` | `path="/reports"` |
| Hàm nào gọi API users | `listUsers` |
| Chỗ nào dùng `BanUserModal` | `BanUserModal` |
| Endpoint API cụ thể | `"/v1/admin/users"` |
| Nơi lưu token | `"admin-auth"` |

> 💡 **Mẹo:** Click chuột phải vào tên function trong VS Code → **"Find All References"** để thấy tất cả nơi hàm đó được gọi.

---

### 🛠️ Bước 5: Dùng React Developer Tools để debug

**Cài đặt:** [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) (Chrome Extension)

**Cách dùng:**

1. Mở DevTools (`F12`) → Tab **"Components"**
2. Click vào bất kỳ element nào trên UI
3. Panel bên phải sẽ hiện:
   - **Tên component** (ví dụ: `UserTable`)
   - **Props đang nhận** (ví dụ: `users: [...]`, `onAction: ƒ`)
   - **State hiện tại** (ví dụ: `filter: "banned"`)
4. Hover vào tên component → Click biểu tượng `<>` để **nhảy thẳng đến source file**!

**Dùng tab "Network" trong DevTools để debug API:**

1. Mở tab **"Network"** → Filter **"Fetch/XHR"**
2. Thực hiện thao tác trên UI (ví dụ: nhấn filter)
3. Xem request được gửi đi: URL, params, response body
4. So sánh với code trong `src/api/*.ts` để tìm điểm khác biệt

---

### 📋 Checklist "Bắt bệnh" cho người mới

Khi nhận task, hãy đi qua checklist này theo thứ tự:

```
□ 1. Mở App.tsx → Tìm <Route> ứng với URL bị lỗi
□ 2. Vào file Page tương ứng → Đọc useQuery hoặc useMutation
□ 3. Tìm component con đang render phần UI bị lỗi
□ 4. Kiểm tra Props được truyền xuống có đúng không
□ 5. Nếu lỗi dữ liệu → Vào src/api/*.ts kiểm tra endpoint
□ 6. Mở DevTools → Tab Network → Xem request/response thực tế
□ 7. Dùng React DevTools → Tab Components → Xem State/Props runtime
```

---

### ⚡ Bảng Tra Cứu Nhanh (Quick Reference)

| Tôi cần làm gì | Vào đâu |
|---|---|
| Thêm trang mới | Tạo file trong `src/pages/`, thêm `<Route>` vào `App.tsx` |
| Gọi API mới | Thêm hàm vào file tương ứng trong `src/api/` |
| Thêm endpoint mới hoàn toàn | Tạo file mới trong `src/api/`, import `adminApi` từ `client.ts` |
| Đổi thông tin người dùng đang login | Sửa `src/store/authStore.ts` |
| Thêm kiểu dữ liệu mới | Thêm `interface` vào `src/types/admin.ts` |
| Thêm component vào layout chung | Sửa `src/components/layout/` |
| Hiểu token được gắn vào request như thế nào | Đọc `src/api/client.ts` — phần `interceptors.request` |

---

> 📝 **Lời khuyên cuối:** Khi mới vào dự án, hãy dành 30 phút đọc 3 file quan trọng nhất: **`App.tsx`** (bản đồ toàn dự án), **`api/client.ts`** (cách nói chuyện với server), và **`store/authStore.ts`** (cách quản lý đăng nhập). Hiểu 3 file này là bạn đã nắm được 70% kiến trúc của dự án.
