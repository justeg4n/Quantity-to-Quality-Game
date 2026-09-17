# Quantity to Quality — WheyStation vs Athens

Game pixel 2D mô phỏng **quy luật Lượng – Chất** (phép biện chứng duy vật): 5 ngày rèn luyện
thể chất tại phòng gym **WheyStation** và tri thức tại học viện **Athens** (mỗi ngày 10 điểm), kết thúc bằng trận
boss 3 pha **"Vòng xoáy biện chứng"**.

> Phaser 3 · TypeScript · Vite · deploy tĩnh trên Vercel. Không cần backend; tiến trình lưu bằng `localStorage`.

## Chạy local

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build tĩnh vào dist/
npm run preview    # xem thử bản build
```

Yêu cầu Node.js ≥ 18.

## Luật chơi (tóm tắt)

| | |
|---|---|
| Thời gian | 5 ngày × 10 điểm đầu ngày = **50 điểm**. Bắt buộc tiêu hết điểm mới được sang ngày. |
| WheyStation | Chọn 1 trong 6 nhóm cơ → mini-game **6 rep** (Mash: bấm Space liên tục · Timing: canh con trỏ vào vùng xanh) → **+1** điểm nhóm cơ. Nhân vật pixel to dần đúng nhóm cơ đã tập. |
| Athens | Chọn 1 trong 6 khối kiến thức → **2 câu trắc nghiệm** (48 câu trong ngân hàng) → **+1** điểm khối đó, hiện đáp án + giải thích + ví dụ gym khi sai. |
| Combo | 3 rep Perfect liên tiếp → combo; 2 combo → +1 điểm phụ trội (luôn phải tập đủ 6 rep). Đúng cả 2 câu → huy hiệu *Triết gia* trong ngày. |
| Boss | **Pha 1** Lượng đổi → Chất đổi (câu hỏi + bùng nổ push-up), **Pha 2** Đấu tranh các mặt đối lập (split-screen timing + quiz đếm giờ), **Pha 3** Phủ định của phủ định (3 bài tập ×3 tiêu hao chỉ số + đề 5 câu). |

### Công thức thắng/thua — SPOILER (cân bằng lõi — `src/data/balance.ts`)

Trong game **không hiển thị** ngưỡng này; người chơi tự khám phá, chỉ khi thua màn kết thúc mới hé lộ chỉ số nào còn thiếu.

```
THẮNG ⇔ Ngực≥3 AND Vai≥3 AND Lưng≥3 AND Chân≥3 AND Bụng≥3 AND Tay≥6
        AND mỗi khối kiến thức (Chất, Lượng, QH Lượng–Chất, Độ, Điểm nút & Bước nhảy, Vận dụng) ≥ 2
Tối thiểu 21 (gym) + 12 (học) = 33/50 điểm, còn 17 điểm tự do.
```

Ở pha 3, mỗi lần thực hiện Push-up (Ngực, Vai, Tay) / Lat Pull Down (Lưng, Tay) / Squat (Chân, Bụng)
trừ 1 điểm ở các nhóm cơ liên quan; câu hỏi thuộc khối chưa học đủ (<2) hiện dạng "▓▓▓" không thể giải.
Thua ở pha 3 → màn kết thúc liệt kê đúng chỉ số chưa đạt ngưỡng và cho **thử lại** (giữ nguyên chỉ số).
Pha 1 và 2 thua chỉ cần chơi lại pha đó, không mất chỉ số.

## Điều khiển

- `← →` / `WASD` di chuyển ở quảng trường, `Space`/`E` vào nhà, click chuột cũng được.
- `Space` hoặc chạm vào nút vàng để thực hiện rep (hỗ trợ mobile).
- Phím `1–4` hoặc click để chọn đáp án.
- `Esc` (hoặc nút ☰ MENU): tạm dừng — tiếp tục, bật/tắt âm thanh, hướng dẫn, về màn hình chính, chơi lại.

## Cấu trúc

```
public/videos/        video demo 6 bài tập (mp4 + poster jpg, đã xử lý bằng ffmpeg)
scripts/process-videos.sh   chuyển .mov gốc → mp4 web (chạy 1 lần offline)
src/
  main.ts             cấu hình Phaser
  config/constants.ts màu sắc, kích thước, tên scene
  data/               balance (công thức thắng/thua), questions (48 câu), exercises, dialogue, types
  systems/            GameState (stats + day + save), StatsManager, ExerciseEngine, QuizEngine, Sfx (WebAudio)
  gfx/                Textures (pixel-art sinh bằng code), Avatar (nhân vật tham số theo chỉ số), Sky (ngày/đêm)
  ui/                 Widgets (Button, StatBar, Radar, Modal, HUD...), QuizPanel, ActionInput
  scenes/             Boot → Title → Town ⇄ Gym/Exercise · Athens/Quiz → DayEnd → Boss → Ending (+ Pause overlay)
```

Toàn bộ sprite/tile/UI được vẽ bằng code (`gfx/Textures.ts`, `gfx/Avatar.ts`) nên không cần asset ảnh.
Video người thật phát trong khung "TV" pixel ở màn tập. Âm thanh chiptune tổng hợp bằng WebAudio.

## Deploy Vercel

1. Push repo lên GitHub.
2. Vercel → **Add New Project** → Import repo → Framework Preset: **Vite** (tự nhận nhờ `vercel.json`).
3. Deploy. Mỗi lần push `main` = 1 deployment mới.

## Xử lý lại video (tuỳ chọn)

```bash
bash scripts/process-videos.sh <thư-mục-chứa-các-file-.mov>
```
