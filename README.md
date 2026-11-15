# Học tiếng Trung HSK

Web học tiếng Trung theo HSK 3.0 và HSK 2.0, chạy trên máy tính và điện thoại qua trình duyệt, có thể thêm vào màn hình chính và dùng offline.

## Tính năng hiện có

- Từ điển hơn 118.000 từ với nghĩa tiếng Việt, tra bằng chữ Hán, pinyin (không cần dấu) hoặc tiếng Việt.
- Tra từ bằng viết tay (viết theo đúng thứ tự nét) và bằng ảnh chụp (nhận dạng chữ ngay trên trình duyệt).
- Trang chi tiết từ: pinyin, nghĩa, cấp HSK, nghe phát âm, câu ví dụ, thứ tự nét có hoạt hình và tập viết.
- Chấm điểm phát âm bằng micro (cần Chrome, Edge hoặc Safari và có mạng).
- Luyện tập: luyện nghe chọn đáp án và luyện phát âm theo cấp HSK hoặc theo flashcard của bạn.
- Lộ trình HSK 3.0 (cấp 1 đến 7-9) và HSK 2.0 (cấp 1 đến 6) với tiến độ học.
- Flashcard lặp lại ngắt quãng (thuật toán FSRS), lưu trên trình duyệt.

Nghĩa tiếng Việt lấy từ CVDICT (dịch máy có rà soát, có thể còn sót lỗi). 506 từ HSK 3.0 cấp 1 có thêm nghĩa ngắn viết tay. Câu ví dụ hiện có 136 câu tự soạn cho từ vựng cấp 1.

## Chạy trên máy

```bash
npm install
npm run dev        # mở http://localhost:3000
npm test           # kiểm tra bộ nhận dạng viết tay
npm run build      # tạo bản web tĩnh trong thư mục out/
```

## Dữ liệu

`npm run build-data` tạo lại các tệp trong `public/data` và `public/hanzi` từ nguồn mở. Nghĩa ngắn viết tay nằm trong `data/vi-*.tsv` (cột: từ, nghĩa, pinyin sửa lại nếu cần), câu ví dụ nằm trong `data/examples.tsv` (cột: câu, pinyin, nghĩa tiếng Việt). Sửa hoặc thêm rồi chạy lại lệnh trên.

## Nguồn và giấy phép dữ liệu

- Nghĩa tiếng Việt: [CVDICT](https://github.com/ph0ngp/CVDICT) của Phong Phan (CC BY-SA 4.0), dịch từ CC-CEDICT.
- Danh sách từ HSK: [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT), nghĩa tiếng Anh lấy từ [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) (CC BY-SA 4.0).
- Dữ liệu nét chữ: [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) qua [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data), theo Arphic Public License (xem `licenses/ARPHICPL.TXT`).
- Thư viện: [Hanzi Writer](https://hanziwriter.org) (MIT), [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT), [Tesseract.js](https://github.com/naptha/tesseract.js) (Apache-2.0) cho nhận dạng chữ trong ảnh.

Dữ liệu từ điển trong `public/data` kế thừa giấy phép CC BY-SA 4.0 của CVDICT và CC-CEDICT.

App không chứa nội dung của giáo trình hay đề thi HSK chính thức.
