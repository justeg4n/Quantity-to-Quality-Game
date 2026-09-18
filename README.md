# Quantity to Quality — WheyStation vs Athens

Game pixel 2D mô phỏng **quy luật Lượng – Chất** (phép biện chứng duy vật): 4 ngày rèn luyện
thể chất tại phòng gym **WheyStation** và tri thức tại học viện **Athens** (mỗi ngày 10 điểm), kết thúc bằng trận
boss 3 phase **"Vòng xoáy biện chứng"**.

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
| Thời gian | 4 ngày × 10 điểm đầu ngày = **40 điểm**. Bắt buộc tiêu hết điểm mới được sang ngày. Ngày nào **không học** → "đầu nhỏ lại": mỗi khối kiến thức −1; ngoài ra mỗi ngày bỏ học đầu nhân vật nhỏ đi 1 cỡ (học bù ngày cuối không kéo lại), ≥ 2 ngày bỏ học → mặt đờ đẫn (mắt lệch, há miệng chảy dãi). Ngày **không tập** → cơ xẹp 1 mức, ≥ 2 ngày → bụng phệ. Học càng nhiều đầu càng to (tới 12 px), ≥ 10 điểm kiến thức đeo kính, ≥ 16 tóc bạc. Chỉ khi học và tập đều thì cơ thể mới cân đối. |
| WheyStation | Chọn 1 trong 6 nhóm cơ → mini-game **6 rep**, mỗi bài một cơ chế riêng (Ngực: bấm liên tục · Vai: canh thời điểm · Lưng: giữ & thả · Tay: bấm đúng tay chỉ định ngẫu nhiên · Bụng: đúng nhịp · Chân: chuỗi mũi tên) → **+1** điểm nhóm cơ. Nhân vật pixel to dần đúng nhóm cơ đã tập. |
| Athens | Chọn 1 trong 6 khối kiến thức → **2 câu trắc nghiệm** (48 câu trong ngân hàng) → **+1** điểm khối đó, hiện đáp án + giải thích + ví dụ gym khi sai. |
| Combo | 3 rep Perfect liên tiếp → combo; 2 combo → +1 điểm phụ trội, lượt tập đó nhận **+2** (luôn phải tập đủ 6 rep). Đúng cả 2 câu → huy hiệu *Triết gia* trong ngày. |
| Boss | Màn hình chia đôi: trên là nhân vật đối đầu vòng xoáy khổng lồ (đổ mồ hôi, mệt dần khi bị tiêu hao), dưới là câu hỏi / thử thách. 3 phase: **Lượng đổi → Chất đổi** (bùng nổ thể lực + câu hỏi) và **Đấu tranh các mặt đối lập** (2 cặp: bài tập canh thời điểm 3 rep + 1 câu hỏi đếm giờ, mỗi cặp một bài tập) xuất hiện theo **thứ tự ngẫu nhiên**, rồi **Phủ định của phủ định** (3 bài tập ×2 + đề 5 câu). Bài tập của mỗi phase (Push-up / Lat Pull Down / Squat) và câu hỏi cũng ngẫu nhiên mỗi trận. Ở 2 phase đầu, mỗi lượt tập trừ 1 điểm các nhóm cơ liên quan và mỗi câu hỏi trừ 1 điểm khối đó; thất bại / trả lời sai trừ thêm 1 ở **mọi** nhóm còn lại. Phase cuối dùng phần còn lại sau tiêu hao. |

### Công thức thắng/thua — SPOILER (cân bằng lõi — `src/data/balance.ts`)

Trong game **không hiển thị** ngưỡng này; người chơi tự khám phá, chỉ khi thua màn kết thúc mới hé lộ chỉ số nào còn thiếu.

```
Phase 3 yêu cầu (trên chỉ số CÒN LẠI sau Phase 1–2):
  Ngực≥2 AND Vai≥2 AND Lưng≥2 AND Chân≥2 AND Bụng≥2 AND Tay≥4
  AND mỗi khối kiến thức (Chất, Lượng, QH Lượng–Chất, Độ, Điểm nút & Bước nhảy, Vận dụng) ≥ 2
Tiêu hao tối thiểu ở 2 phase đầu (chơi hoàn hảo; bài tập X, Y ngẫu nhiên trong 3 bài):
  "Lượng đổi":  1 lượt bài X (−1 các nhóm cơ của X) + 2 câu hỏi (−1 khối/câu)
  "Đấu tranh":  2 cặp, mỗi cặp = 1 lượt bài Y/Z gồm 3 rep (−1 các nhóm cơ, tính 1 lần cho cả lượt; mỗi rep trượt phạt −1 mọi nhóm cơ khác) + 1 câu hỏi (−1 khối/câu)
X, Y, Z là 3 bài xáo thứ tự → cả trận dùng mỗi bài đúng 1 lần: Ngực/Vai/Lưng/Chân/Bụng ≥ 3, Tay ≥ 6 (dùng ở 2 bài)
=> Tối thiểu để chắc thắng 21 (gym) + 16 (học) = 37/40 điểm, còn 3 điểm dự phòng.
```

Câu hỏi ở 2 phase đầu theo đúng concept phase (*Lượng đổi*: Chất/Lượng/QH Lượng–Chất; *Đấu tranh*: Độ/Điểm nút & Bước nhảy) và trong nhóm đó rút từ khối người chơi đang tích luỹ **nhiều nhất** (để phần tiêu hao không dồn vào khối yếu
một cách may rủi). Ở phase cuối, mỗi lần thực hiện Push-up (Ngực, Vai, Tay) / Lat Pull Down (Lưng, Tay) / Squat (Chân, Bụng)
trừ 1 điểm ở các nhóm cơ liên quan; câu hỏi thuộc khối còn lại <2 hiện dạng "▓▓▓" không thể giải.
Thua ở phase cuối → màn kết thúc liệt kê đúng chỉ số chưa đạt ngưỡng và cho **thử lại** (chỉ số khôi phục như trước trận).
Thua ở 2 phase đầu chỉ cần chơi lại phase đó, chỉ số khôi phục như lúc bắt đầu phase.

## Điều khiển

- `← →` / `WASD` di chuyển ở quảng trường, `Space`/`E` vào nhà, click chuột cũng được.
- `Space` hoặc chạm vào nút vàng để thực hiện rep (hỗ trợ mobile). Bài Tay bấm đúng tay được chỉ định ngẫu nhiên bằng `A`/`D` (hoặc `←`/`→`), bài Chân dùng phím mũi tên / `WASD`; trên mobile có nút tương ứng.
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
