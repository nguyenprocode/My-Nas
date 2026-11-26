<div align="center">

<img src="public/img/logo.svg" alt="My NAS" width="50%" height="50%" />

# My NAS

**Biến repo GitHub của bạn thành một NAS cá nhân, gọn nhẹ và không cần cài thư viện nào.**

Tải lên là commit vào repo. Tải về là lấy lại từ GitHub.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=for-the-badge)](#tính-năng)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](#giấy-phép)

[Tính năng](#tính-năng) ·
[Cài đặt](#cài-đặt-nhanh) ·
[Cấu hình](#cấu-hình) ·
[Đăng nhập](#đăng-nhập) ·
[Triển khai](#đưa-lên-mạng) ·
[Lưu ý](#lưu-ý-quan-trọng)

</div>

---

## Tính năng

| Tính năng | Mô tả |
|---|---|
| **Nhiều trang riêng** | Trang chủ, Storage, Thùng rác, Cài đặt là các trang có địa chỉ riêng, tải lại hoặc gửi đường dẫn thư mục đều mở đúng chỗ |
| **Trang chủ** | Dung lượng đã dùng, thao tác nhanh (tải lên, thư mục mới, dọn thùng rác), thư mục, tệp gần đây và trạng thái máy chủ (CPU, RAM, thời gian chạy) |
| **Tệp và thư mục** | Duyệt thư mục, tạo thư mục mới, tạo tệp văn bản mới (mở ngay trình soạn thảo), **đổi tên** tệp hoặc thư mục (menu ⋮, một commit), tải tệp về |
| **Xem trước** | Bấm vào ảnh hoặc PDF để xem ngay trong trang, dùng phím `←` `→` để chuyển giữa các ảnh trong thư mục |
| **Mở và chỉnh sửa tệp** | Mở một tệp văn bản (tối đa 1 MB) thành trang riêng `/edit?path=...` để sửa. Bấm **Lưu** hoặc `Ctrl` + `S` thì quay về thư mục ngay và việc lưu chạy nền (một commit). Trang soạn thảo là trang riêng toàn màn hình (không thanh bên, không nút menu), có nút bật/tắt tự xuống dòng, dùng tốt trên điện thoại. Lưu lỗi thì app hỏi mở lại trình soạn thảo với nội dung đã gõ, không mất chữ |
| **Tải lên an toàn** | Tải lên tệp trùng tên sẽ hỏi trước khi ghi đè, và bị chặn khi kho vượt hạn mức dung lượng |
| **Di chuyển bằng kéo thả** | Kéo tệp hoặc thư mục trong danh sách thả lên một thư mục, hoặc lên thanh đường dẫn (home / tên thư mục) để di chuyển. Di chuyển cả thư mục chỉ tạo **một** commit |
| **Kéo thả tải lên** | Kéo tệp **hoặc thư mục** từ máy tính thả vào trang là tải lên, có thanh tiến trình. Thư mục giữ nguyên cấu trúc, bỏ qua `.git` và `node_modules` (mỗi tệp là một commit nên thư mục nhiều tệp sẽ tải lâu). Nút **Tải lên** có hai lựa chọn: tải tệp, tải thư mục |
| **Tìm kiếm nhanh** | Nhấn `Ctrl` + `K` (hoặc `Cmd` + `K`) ở bất cứ đâu |
| **Thùng rác** | Xóa nhầm vẫn khôi phục lại được, hoặc xóa vĩnh viễn. Xóa hoặc khôi phục cả thư mục chỉ tạo **một** commit. Tệp tự xóa vĩnh viễn sau `TRASH_DAYS` ngày (mặc định 15), trang Thùng rác hiện số ngày còn lại |
| **Thông báo** | Chuông thông báo nhận tin từ tác giả |
| **Giao diện tối / sáng** | Mặc định là tối, đổi trong phần Cài đặt |
| **Dùng trên điện thoại** | Giao diện responsive |

> [!TIP]
> Không cần `npm install`. Dự án không có thư viện phụ thuộc, chỉ cần **Node.js 18+** là chạy được ngay.

---

## Cài đặt nhanh

### 1. Tạo repo lưu trữ

Tạo một repo GitHub để chứa file (nên chọn **Private**). Nếu không khai báo `GITHUB_REPO`, app sẽ dùng repo tên `storage-file` trong tài khoản của token, nên bạn có thể đặt tên repo là `storage-file`. Tạo sẵn nhánh `main` (chỉ cần có một commit, ví dụ file README).

### 2. Tạo token

Vào **GitHub > Settings > Developer settings > Fine-grained tokens**, chọn đúng repo vừa tạo và cấp quyền:

| Quyền | Mức |
|---|---|
| Contents | **Read and write** |

### 3. Cấu hình

Trong thư mục dự án:

```bash
cp .env.example .env
```

Mở `.env` và điền ít nhất `GITHUB_TOKEN` và `APP_PASSWORD` (`GITHUB_REPO` có thể bỏ trống nếu bạn dùng repo `storage-file`):

```env
GITHUB_TOKEN=github_pat_xxxxxxxxxxxxxxxx
GITHUB_REPO=tenban/storage-file
APP_PASSWORD=doi-mat-khau-nay
```

### 4. Chạy

```bash
node server.js
```

Hoặc:

```bash
npm start
```

### 5. Truy cập

Mở **http://localhost:3000** và đăng nhập:

- **Tên đăng nhập:** tên GitHub của token (máy chủ tự hỏi GitHub, không cần khai báo)
- **Mật khẩu:** giá trị `APP_PASSWORD`

> [!NOTE]
> Mặc định file được lưu trong thư mục `files/` của nhánh `main`. Bạn có thể đổi bằng `GITHUB_FOLDER` và `GITHUB_BRANCH`.

---

## Cấu hình

Các biến đặt trong file `.env` (hoặc biến môi trường của dịch vụ bạn triển khai).

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `GITHUB_TOKEN` | Có | | Token GitHub có quyền Contents: Read and write |
| `APP_PASSWORD` | Có | | Mật khẩu đăng nhập web |
| `GITHUB_REPO` | Không | `<tài-khoản-của-token>/storage-file` | Repo lưu file, dạng `tenban/ten-repo` |
| `GITHUB_BRANCH` | Không | `main` | Nhánh lưu file |
| `GITHUB_FOLDER` | Không | `files` | Thư mục lưu file trong repo |
| `PORT` | Không | `3000` | Cổng máy chủ |
| `MAX_UPLOAD_MB` | Không | `50` | Dung lượng tối đa mỗi tệp tải lên (MB) |
| `STORAGE_LIMIT_GB` | Không | `4` | Hạn mức dung lượng của kho (GB). Tải lên bị chặn khi vượt mức này |
| `TRASH_DAYS` | Không | `15` | Số ngày tệp nằm trong thùng rác trước khi tự xóa vĩnh viễn. Đặt `0` để tắt tự xóa |
| `TRUST_PROXY` | Không | tắt | Đặt `true` khi chạy sau một proxy tin cậy (xem phần Đăng nhập) |
| `FORCE_HTTPS` | Không | tắt | Đặt `true` (cùng `TRUST_PROXY=true`) khi chạy sau proxy HTTPS để tự chuyển `http` sang `https` (xem phần Đăng nhập) |
| `AUTHOR_NAME` | Không | tên GitHub | Tên hiển thị của chủ kho |

---

## Đăng nhập

Web chỉ dùng **một tài khoản với một token duy nhất** (`GITHUB_TOKEN` + `APP_PASSWORD`). Các biến có hậu tố `_2`, `_3`... không còn được đọc.

| Hạng mục | Chi tiết |
|---|---|
| Tên đăng nhập | Tên GitHub của token |
| Mật khẩu | `APP_PASSWORD` |
| Chống dò mật khẩu | Sai quá **8 lần trong 10 phút** từ một địa chỉ IP sẽ bị tạm khóa |
| Thời hạn phiên | **1 ngày** (24 giờ), sau đó cần đăng nhập lại |

> [!WARNING]
> Đổi token hoặc mật khẩu thì **phiên đăng nhập cũ sẽ mất hiệu lực**.

> [!NOTE]
> Mặc định app dùng địa chỉ kết nối trực tiếp và **bỏ qua** header `X-Forwarded-For`, nên không thể né giới hạn bằng cách giả header.
> Nếu chạy sau một proxy (Nginx, Render, Railway...), mọi người dùng sẽ có chung IP của proxy. Khi đó hãy đặt `TRUST_PROXY=true`: app sẽ lấy IP ở **cuối** `X-Forwarded-For` (do proxy nối vào). Chỉ bật khi có đúng một proxy tin cậy đứng trước và nó ghi header này; nếu không, người ngoài có thể tự khai IP.

> [!NOTE]
> **Header bảo mật và HTTPS.** Mọi phản hồi đều kèm `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` (chống nhúng web vào trang khác), `Referrer-Policy: no-referrer` và `Permissions-Policy`. Khi truy cập qua HTTPS (trực tiếp hoặc qua proxy báo `X-Forwarded-Proto: https`), web gửi thêm `Strict-Transport-Security` (1 năm) để trình duyệt luôn dùng HTTPS. Mật khẩu và phiên đăng nhập đi qua mạng, nên **hãy luôn chạy web qua HTTPS** (Render, Railway... có sẵn). Muốn ép chuyển hướng: đặt `TRUST_PROXY=true` và `FORCE_HTTPS=true`; app chỉ chuyển khi proxy báo rõ `X-Forwarded-Proto: http`, nên kiểm tra sức khỏe nội bộ và `localhost` không bị ảnh hưởng.
> Nếu sau này thêm thư viện hoặc phông chữ từ máy chủ ngoài, cần bổ sung nguồn đó vào `CSP` ở đầu `server.js`, nếu không trình duyệt sẽ chặn.
> Vì CSP chỉ cho chạy script từ file của chính web, **đừng viết `<script>` trực tiếp hay `onclick="..."` trong file HTML**; hãy đặt mã vào một file trong `public/js/` (như nút hiện mật khẩu ở `login.js`), nếu không trình duyệt sẽ chặn mà không báo lỗi trên giao diện.

---

## Cấu trúc thư mục

```text
Nas
├── server.js              Máy chủ Node (API + phục vụ file trong public/)
├── package.json           Thông tin dự án, lệnh npm start
├── package-lock.json      Khóa phiên bản (dự án không có thư viện phụ thuộc)
├── LICENSE                Giấy phép MIT
├── README.md              Tài liệu này
├── .env.example           Mẫu cấu hình, sao chép thành .env
├── .gitignore             Bỏ qua .env và node_modules
└── public
    ├── index.html         Trang chủ (/)
    ├── files.html         Storage (/files, thư mục hiện tại nằm ở ?path=...)
    ├── trash.html         Thùng rác (/trash)
    ├── settings.html      Cài đặt (/settings)
    ├── edit.html          Mở và chỉnh sửa một tệp (/edit?path=...)
    ├── login.html         Trang đăng nhập
    ├── css
    │   ├── base.css       Biến màu, nút, ô nhập dùng chung
    │   ├── app.css        Giao diện trang chính
    │   └── login.css      Giao diện trang đăng nhập
    ├── js
    │   ├── theme.js       Áp dụng giao diện sáng/tối (cả hai trang)
    │   ├── guard.js       Chưa đăng nhập thì chuyển sang login.html
    │   ├── login.js       Xử lý đăng nhập
    │   ├── icons.js       Bộ biểu tượng và biểu tượng tệp
    │   └── app.js         Dựng khung chung (thanh bên, thanh trên) và logic của từng trang
    └── img
        ├── logo.svg       Logo (thanh bên, trang đăng nhập và favicon)
        ├── banner.png     Ảnh nền banner ở trang chủ
        └── cloudup.png    Biểu tượng khung tải lên ở trang chủ
```

Mỗi mục là một trang riêng: `/` (Trang chủ), `/files`, `/trash`, `/settings`, và `/edit` cho từng tệp đang mở. Mở bất kỳ trang nào khi chưa đăng nhập sẽ tự chuyển sang `/login.html`.

---

## Đưa lên mạng

Chạy trên bất kỳ máy chủ Node nào: **VPS**, **Render**, **Railway**, **Fly.io**...

Đặt các biến trong `.env` thành biến môi trường của dịch vụ đó.

> [!IMPORTANT]
> Hãy **bật HTTPS**, vì mật khẩu được gửi trong header của mỗi request.

---

## Thông báo từ tác giả

Chuông thông báo trên web nhận tin từ một file JSON công khai.

**Cách hoạt động**

1. Link **raw** tới file JSON được ghi cố định trong `server.js` (hằng số `NOTICE_URL`, có ghi chú không được xóa).
2. Nếu giá trị này bị sửa thành chuỗi chứa chữ `TEN_GITHUB` thì tính năng **tự tắt**.
3. Web đọc file khi mở trang, mỗi **10 phút** và khi mở chuông.
4. Mỗi thông báo có trường `t` (giờ gửi, ví dụ `2026-11-25T08:00:00+07:00`). Web so `t` với giờ hiện tại: **chưa đến giờ thì chưa hiện**, đến hoặc quá giờ thì mới thông báo. Không có `t` thì hiện ngay. Nên ghi kèm múi giờ (`+07:00`) để không bị lệch.
5. Thông báo mới được lưu vào trình duyệt, nên dù sau này bị xóa khỏi file raw thì người dùng vẫn còn thấy.

---

## Lưu ý quan trọng

**Thùng rác và dung lượng**

- Thùng rác nằm ở `<GITHUB_FOLDER>/.trash/` trong repo (mặc định `files/.trash/`).
- "Xóa vĩnh viễn" chỉ gỡ file khỏi nhánh, bản cũ vẫn nằm trong lịch sử Git nên **dung lượng repo không giảm**.
- Mỗi lần tải lên một tệp là một commit; di chuyển, xóa hoặc khôi phục (cả thư mục) cũng chỉ là một commit. Lịch sử Git vẫn phình dần theo thời gian.
- Tải lên tệp trùng tên: app hỏi trước khi ghi đè. Bản cũ vẫn nằm trong lịch sử Git.
- Tệp trong thùng rác tự xóa vĩnh viễn sau `TRASH_DAYS` ngày (mặc định 15, đặt `0` để tắt). Ngày xóa lưu trong `<GITHUB_FOLDER>/.trash/.nasmeta.json`. Mỗi lần mở bất kỳ trang nào của web (tối đa 1 phút một lần), server quét thùng rác, nếu thấy tệp quá hạn, server xóa hết chúng ở nền (mỗi lượt 20 tệp để các thao tác khác xen vào được).
- Nếu GitHub từ chối commit gộp, thao tác tự chuyển sang áp dụng từng tệp qua Contents API.
- Khôi phục trùng tên với tệp đang có thì hiện hộp thoại 2 lựa chọn: **Ghi đè** (thay tệp hiện có bằng bản trong thùng rác) hoặc **Đổi tên** (giữ cả hai, bản khôi phục thành `file (1).ext`).
- Xóa một tệp trùng tên với tệp đã có trong thùng rác thì tệp mới được lưu thành `file (1).ext`, không ghi đè bản cũ.

**Di chuyển**

- Kéo một mục trong danh sách thả lên thư mục đích hoặc lên thanh đường dẫn phía trên danh sách.
- Không di chuyển được thư mục vào chính nó hoặc vào thư mục con của nó, và không di chuyển vào thùng rác bằng cách này (dùng nút ⋮ để xóa).
- Nếu thư mục đích đã có tệp trùng tên thì app báo lỗi và không làm gì, không ghi đè.
- Thao tác kéo thả dùng chuột trên máy tính. Trên điện thoại cảm ứng, tùy trình duyệt mà có thể không kéo được.

**Trạng thái máy chủ**

- CPU, RAM và thời gian chạy trên trang chủ là của máy đang chạy `server.js`.
- Một số môi trường (ví dụ Termux) không cung cấp số CPU nên sẽ hiện dấu `—`.

**Giới hạn**

- Tải lên mặc định tối đa **50 MB** mỗi file (`MAX_UPLOAD_MB`).
- Tổng dung lượng kho (tính cả thùng rác) không được vượt `STORAGE_LIMIT_GB`, nếu vượt thì tải lên báo lỗi.
- API Contents của GitHub không ổn định với file lớn, nên đừng đặt giá trị này quá cao.

> [!CAUTION]
> **Không bao giờ commit hoặc gửi file `.env` cho người khác.** File này chứa token và mật khẩu của bạn. Nếu lỡ lộ, hãy thu hồi token trên GitHub và tạo token mới.

**Phù hợp với**

| Nên dùng | Không nên dùng |
|---|---|
| Tài liệu | Video |
| Ảnh nhỏ | Bản sao lưu hàng GB |
| Bản sao lưu nhẹ | File dung lượng rất lớn |

---

## Giấy phép

Phát hành theo giấy phép [MIT](LICENSE).

<div align="center">

Nếu thấy hữu ích, hãy để lại một ngôi sao cho dự án nhé.

</div>
