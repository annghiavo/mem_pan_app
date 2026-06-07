# 🚀 Hướng Dẫn Onboarding — Admin Web (mem_pan_admin)

> **Dành cho:** Developer mới gia nhập dự án  
> **Codebase:** `mem_pan_admin/admin-web/src`  
> **Tech stack:** React + TypeScript + React Query + Zustand + React Router

---

## Mục lục

1. [Tổng quan luồng hoạt động của dự án](#1-tổng-quan-luồng-hoạt-động-của-dự-án)
2. [Hành trình của dữ liệu: Từ API đến màn hình](#2-hành-trình-của-dữ-liệu-từ-api-đến-màn-hình)
3. [Cẩm nang "Bắt bệnh": Bắt đầu từ đâu khi cần sửa code?](#3-cẩm-nang-bắt-bệnh-bắt-đầu-từ-đâu-khi-cần-sửa-code)

---

## 1. Tổng quan luồng hoạt động của dự án

### React là gì? — Giải thích bằng ví von thực tế

Hãy hình dung bạn đang xây một tờ báo online.

| Khái niệm React | Ví von thực tế |
|---|---|
| **Component** | Mỗi mục trên tờ báo: tiêu đề, bảng danh sách, nút bấm... Mỗi cái là một "mảnh ghép" độc lập, có thể tái sử dụng ở nhiều nơi. |
| **State** | "Bộ nhớ ngắn hạn" của một Component. Ví dụ: ô tìm kiếm đang gõ gì, trang hiện tại là bao nhiêu, dữ liệu vừa fetch về là gì. Khi **State thay đổi**, React tự động vẽ lại giao diện. |
| **Props** | Cách một Component cha "truyền thông tin" xuống Component con. Giống như sếp giao việc cho nhân viên: sếp quyết định nội dung, nhân viên chỉ hiển thị theo. |

> **Quy tắc vàng:** Dữ liệu chỉ chảy **một chiều** — từ cha xuống con qua Props. Con muốn báo ngược lên cha thì phải dùng **callback function** được truyền xuống qua Props.

---

### Kiến trúc thư mục dự án `admin-web/src`

```
src/
├── api/                  ← Nơi khai báo tất cả hàm gọi API
│   ├── client.ts         ← Cấu hình Axios (base URL, token, interceptor)
│   ├── decks.ts          ← Các hàm API liên quan đến Deck
│   ├── users.ts          ← Các hàm API liên quan đến User
│   └── ...
│
├── pages/                ← Mỗi file = một trang lớn, map với một URL
│   ├── DecksPage.tsx     → /decks
│   ├── UsersPage.tsx     → /users
│   ├── LoginPage.tsx     → /login
│   └── ...
│
├── components/           ← Các mảnh ghép UI nhỏ hơn, dùng lại được
│   ├── decks/
│   │   └── DeckTable.tsx ← Bảng hiển thị danh sách deck (con của DecksPage)
│   ├── layout/
│   │   ├── Sidebar.tsx   ← Thanh điều hướng bên trái
│   │   └── TopBar.tsx    ← Thanh trên cùng
│   └── ...
│
├── store/                ← Lưu trữ dữ liệu toàn cục (dùng Zustand)
│   └── authStore.ts      ← Quản lý trạng thái đăng nhập (token, role...)
│
├── types/                ← Định nghĩa kiểu dữ liệu TypeScript (interface, type)
│
├── App.tsx               ← Nơi khai báo toàn bộ Routes (URL → Page)
└── main.tsx              ← Điểm khởi động của ứng dụng
```

---

### Luồng dữ liệu tổng quan

Đây là hành trình **từ khi user click nút đến khi thấy dữ liệu trên màn hình**:

```
[User bấm nút / mở trang]
         │
         ▼
[React Router] → Xác định URL, render đúng Page
         │
         ▼
[Page Component] → Gọi hàm API từ thư mục src/api/
         │
         ▼
[Axios Client] → Gửi HTTP request lên Backend Server
         │
         ▼
[Backend trả về JSON]
         │
         ▼
[React Query] → Cache dữ liệu, cập nhật State
         │
         ▼
[Component re-render] → Hiển thị dữ liệu mới lên màn hình
```

> **Lưu ý quan trọng trong dự án này:**  
> Dự án dùng **React Query** (`@tanstack/react-query`) để fetch data — không dùng `useEffect` + `fetch` thủ công. React Query tự xử lý loading/error/caching. Đây là best practice hiện đại.

---

## 2. Hành trình của dữ liệu: Từ API đến màn hình

Lấy ví dụ thực tế từ tính năng **"Xem danh sách Deck"** trong dự án.

### Bước 1 — Khai báo API (trong `src/api/`)

File: `src/api/decks.ts`

```typescript
// 1. Import Axios client đã được cấu hình sẵn (có token, base URL)
import { adminApi } from "./client";

// 2. Định nghĩa kiểu dữ liệu trả về (TypeScript giúp bạn không bị nhầm field)
export interface Deck {
  deckId: string;
  name: string;
  status: "active" | "deleted";
  cardCount: number;
  // ... các field khác
}

export interface ListDecksResponse {
  decks: Deck[];         // Mảng các deck
  nextPageToken: string; // Token để load trang kế
}

// 3. Viết hàm gọi API — trả về dữ liệu đã được unwrap (chỉ lấy r.data)
export const listDecks = (params: { pageSize?: number; pageToken?: string }) =>
  adminApi
    .get<ListDecksResponse>("/v1/admin/decks", { params })
    .then((r) => r.data); // ← .then(r => r.data) giúp bỏ qua metadata của Axios
```

**💡 Tại sao lại tách riêng như vậy?**
- Nếu backend đổi URL, bạn chỉ sửa ở `src/api/`, không phải tìm khắp codebase.
- Giúp tái sử dụng: nhiều Page có thể gọi cùng một hàm API.

---

### Bước 2 — Gọi API trong Page Component (dùng `useQuery`)

File: `src/pages/DecksPage.tsx`

```typescript
import { useState } from "react";
import { useQuery } from "@tanstack/react-query"; // ← Hook "thần kỳ" của React Query
import { listDecks } from "../api/decks";

export default function DecksPage() {
  // State cục bộ: đang ở trang nào?
  const [pageToken, setPageToken] = useState("");

  // useQuery nhận vào:
  // - queryKey: "tên" của cache. Khi key thay đổi → tự động gọi lại API
  // - queryFn: hàm thực sự gọi API
  const { data, isLoading, isError } = useQuery({
    queryKey: ["decks", pageToken],       // ← Cache key
    queryFn: () => listDecks({ pageSize: 20, pageToken }),
  });

  // Xử lý 3 trạng thái: loading / lỗi / có dữ liệu
  if (isLoading) return <p>Đang tải...</p>;
  if (isError)   return <p>Có lỗi xảy ra!</p>;

  return <DeckTable decks={data?.decks ?? []} />;
}
```

**💡 `useQuery` tự động lo những việc sau — bạn không cần viết thêm:**
- Hiển thị trạng thái loading khi đang fetch
- Bắt lỗi và đưa vào `isError`
- Cache kết quả để không gọi lại API không cần thiết
- Tự refresh khi `queryKey` thay đổi

---

### Bước 3 — Truyền dữ liệu xuống Component con (Props)

```typescript
// Trong DecksPage.tsx — Component CHA
// data.decks là mảng Deck[] từ API
<DeckTable decks={data?.decks ?? []} />
//         ↑ Truyền mảng decks qua Props tên là "decks"

// -------------------------------------------------

// Trong DeckTable.tsx — Component CON
// Nhận Props và định nghĩa kiểu rõ ràng
interface Props {
  decks: Deck[]; // ← Phải khớp với tên prop bên trên
}

export default function DeckTable({ decks }: Props) {
  // Giờ có thể dùng biến "decks" bình thường
}
```

---

### Bước 4 — Render dữ liệu ra giao diện (JSX + `.map()`)

File: `src/components/decks/DeckTable.tsx`

```typescript
export default function DeckTable({ decks }: Props) {
  // Trường hợp đặc biệt: không có dữ liệu
  if (decks.length === 0) {
    return <p>Không có deck nào.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Tên Deck</th>
          <th>Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        {/* .map() = duyệt qua từng phần tử và trả về JSX */}
        {decks.map((deck) => (
          // "key" là bắt buộc khi dùng .map() — giúp React nhận diện từng dòng
          <tr key={deck.deckId}>
            <td>{deck.name}</td>
            <td>{deck.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

> **⚠️ Lỗi phổ biến của newbie:** Quên prop `key` khi dùng `.map()`. React sẽ cảnh báo trên Console và hiệu năng sẽ kém hơn. Luôn dùng một ID duy nhất từ dữ liệu như `deck.deckId`.

---

### Toàn bộ luồng — Sơ đồ tóm tắt

```
src/api/decks.ts          src/pages/DecksPage.tsx       src/components/decks/DeckTable.tsx
─────────────────         ───────────────────────       ──────────────────────────────────
                                                        
listDecks()    ──────►    useQuery(queryFn: listDecks)  
                               │                        
                               │ data.decks (Props)     
                               └──────────────────────► DeckTable({ decks })
                                                              │
                                                              │ .map(deck => <tr>)
                                                              ▼
                                                        [Hiển thị bảng trên màn hình]
```

---

## 3. Cẩm nang "Bắt Bệnh": Bắt đầu từ đâu khi cần sửa code?

### Quy trình 5 bước — Từ yêu cầu đến đúng file cần sửa

---

#### 🔍 Bước 1: Nhìn vào URL trên trình duyệt

URL trên browser là **bản đồ** dẫn bạn đến đúng Page Component.

**Tra cứu tại:** `src/App.tsx`

```typescript
// Trong App.tsx — đây là "bản đồ" URL của toàn bộ ứng dụng
<Routes>
  <Route path="/login"        element={<LoginPage />} />
  <Route path="/decks"        element={<DecksPage />} />
  <Route path="/decks/:id"    element={<DeckDetailPage />} />
  <Route path="/users"        element={<UsersPage />} />
  <Route path="/users/:id"    element={<UserDetailPage />} />
  <Route path="/reports"      element={<ReportsPage />} />
</Routes>
```

| URL trên trình duyệt | File cần mở |
|---|---|
| `/decks` | `src/pages/DecksPage.tsx` |
| `/decks/abc-123` | `src/pages/DeckDetailPage.tsx` |
| `/users` | `src/pages/UsersPage.tsx` |
| `/login` | `src/pages/LoginPage.tsx` |

---

#### 🗺️ Bước 2: Mở Page Component — Thu hẹp xuống Component con

Sau khi mở đúng Page, đọc phần **return (...)** để xem nó dùng Component con nào.

```typescript
// Ví dụ trong DecksPage.tsx
return (
  <div>
    <DeckTable decks={data?.decks ?? []} />  {/* ← Component con */}
  </div>
);
```

Nếu vấn đề nằm ở **bảng danh sách** → mở `src/components/decks/DeckTable.tsx`.  
Nếu vấn đề nằm ở **logic tải dữ liệu / filter** → sửa ngay trong `DecksPage.tsx`.

**Mẹo:** Nhấn `Cmd + Click` (macOS) lên tên Component trong VS Code để nhảy thẳng vào file đó.

---

#### 🔎 Bước 3: Tìm nút bấm đang gọi hàm/API nào

Khi thấy một nút bấm trên giao diện, tìm sự kiện `onClick` của nó trong code:

```typescript
// Ví dụ: Nút "Go" để tìm kiếm deck theo ID
<button onClick={() => navigate(`/decks/${encodeURIComponent(trimmed)}`)}>
  Go
</button>
// → Nút này KHÔNG gọi API, chỉ điều hướng sang trang khác

// Ví dụ: Nút filter status
<button onClick={() => { setFilter(f.key); setPageToken(""); }}>
  {f.label}
</button>
// → Nút này thay đổi State "filter"
// → State thay đổi → queryKey thay đổi → useQuery tự gọi lại API
```

**Quy trình truy vết nút bấm:**

```
Nút bấm
  └── onClick={() => someFunction()}
        └── someFunction trong cùng file?
              ├── Có → đọc hàm đó
              └── Không → tìm trong import ở đầu file
                    └── Thường là từ src/api/ hoặc mutation của React Query
```

---

#### 🧰 Bước 4: Dùng React Developer Tools để xác định Component

**Cài extension:** [React Developer Tools](https://chromewebstore.google.com/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) cho Chrome/Edge/Firefox.

**Cách dùng:**
1. Mở trang web cần debug.
2. Nhấn `F12` mở DevTools → chọn tab **"Components"**.
3. Click vào icon 🖱️ rồi click trực tiếp lên phần tử trên màn hình.
4. DevTools sẽ highlight đúng Component, hiển thị **tên file, props, state** hiện tại.

```
[Click lên bảng Deck trên màn hình]
         ↓
[DevTools Components tab hiển thị]
  ▼ DecksPage
      ▼ DeckTable          ← Đây là Component bạn cần sửa
          props: { decks: [...] }
          state: (không có state)
```

---

#### 📋 Bước 5: Checklist trước khi sửa bất kỳ điều gì

Trước khi bắt tay sửa code, hãy tự hỏi:

- [ ] **Vấn đề xảy ra ở đâu?** UI hiển thị sai, hay dữ liệu từ API đã sai rồi?  
      → Mở Network tab trong DevTools, xem response của API trước.
- [ ] **Component nào cần sửa?** Page (logic) hay Component con (UI)?
- [ ] **Sửa logic hay sửa giao diện?** Logic thường ở Page, giao diện thường ở `components/`.
- [ ] **Hàm API đang dùng tên gì?** Tìm trong phần `import` đầu file Page.

---

### Bảng tra cứu nhanh — "Tôi cần sửa cái gì, sửa ở đâu?"

| Yêu cầu từ khách hàng | Bắt đầu từ đâu |
|---|---|
| "Đổi màu/label nút bấm X" | Mở Page → tìm `<button` có label đó |
| "Thêm cột mới vào bảng Deck" | `src/components/decks/DeckTable.tsx` |
| "API trả về thêm field mới, hiển thị nó lên" | 1. Thêm field vào `interface` trong `src/api/decks.ts` → 2. Hiển thị trong Component |
| "Trang /decks bị lỗi khi load" | `src/pages/DecksPage.tsx` → xem `useQuery` |
| "Nút bấm không hoạt động" | Tìm `onClick` của nút → trace theo hàm được gọi |
| "Sau khi login không redirect đúng" | `src/pages/LoginPage.tsx` và `src/store/authStore.ts` |
| "Thêm trang mới `/foo`" | 1. Tạo `src/pages/FooPage.tsx` → 2. Thêm `<Route>` vào `src/App.tsx` |

---

### Mẹo vặt đáng nhớ

- **Đọc `import` trước** — Dòng import ở đầu file cho bạn biết Component này phụ thuộc vào những gì.
- **`Cmd+Shift+F` (VS Code)** — Tìm kiếm toàn bộ codebase theo tên hàm, tên API endpoint, hoặc đoạn text.
- **`console.log` chiến lược** — Log trong `queryFn` để xem API trả gì. Log trong `return` của Component để xem props nhận gì.
- **Network tab trong DevTools** — Đây là nơi xem API thực sự gửi gì và nhận gì. Filter theo `Fetch/XHR`.
- **Đừng sửa `src/api/client.ts` bừa bãi** — File này ảnh hưởng đến **toàn bộ** API call trong app.

---

*Tài liệu này được tạo cho dự án `mem_pan_admin/admin-web`. Cập nhật lần cuối: 07/06/2026.*
