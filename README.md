# Học tiếng Trung HSK

Web học tiếng Trung theo HSK 3.0 và HSK 2.0, chạy trên máy tính và điện thoại qua trình duyệt, có thể thêm vào màn hình chính và dùng offline.

## Tính năng hiện có

- Tra từ bằng chữ Hán, pinyin (không cần dấu), tiếng Việt hoặc tiếng Anh.
- Tra từ bằng viết tay (viết theo đúng thứ tự nét).
- Trang chi tiết từ: pinyin, nghĩa, cấp HSK, nghe phát âm, thứ tự nét có hoạt hình và tập viết.
- Lộ trình HSK 3.0 (cấp 1 đến 7-9) và HSK 2.0 (cấp 1 đến 6) với tiến độ học.
- Flashcard lặp lại ngắt quãng (thuật toán FSRS), lưu trên trình duyệt.

Từ điển hiện gồm 11.470 từ trong các danh sách HSK. Nghĩa tiếng Việt đã có cho 506 từ HSK 3.0 cấp 1, các từ còn lại tạm hiển thị nghĩa tiếng Anh.

## Chạy trên máy

```bash
npm install
npm run dev        # mở http://localhost:3000
npm test           # kiểm tra bộ nhận dạng viết tay
npm run build      # tạo bản web tĩnh trong thư mục out/
```

## Dữ liệu

`npm run build-data` tạo lại các tệp trong `public/data` và `public/hanzi` từ nguồn mở. Nghĩa tiếng Việt nằm trong `data/vi-*.tsv` (cột: từ, nghĩa, pinyin sửa lại nếu cần), thêm tệp mới rồi chạy lại lệnh trên.

## Nguồn và giấy phép dữ liệu

- Danh sách từ HSK: [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT), nghĩa tiếng Anh lấy từ [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) (CC BY-SA 4.0).
- Dữ liệu nét chữ: [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) qua [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data), theo Arphic Public License (xem `licenses/ARPHICPL.TXT`).
- Thư viện: [Hanzi Writer](https://hanziwriter.org) (MIT), [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT).

App không chứa nội dung của giáo trình hay đề thi HSK chính thức.
