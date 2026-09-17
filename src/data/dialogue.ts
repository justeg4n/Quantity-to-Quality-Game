/** Thoại NPC và flavor text (mục 6–7 tài liệu thiết kế) */

export const TRAINER_LINES: string[] = [
  'Chào mừng tới WheyStation! Tạ không tự nâng đâu, bắt đầu thôi!',
  'Mỗi rep là một đơn vị "lượng". Tích đủ rồi cơ bắp sẽ "đổi chất"!',
  'Giữ form đi! Nhanh mà sai còn tệ hơn chậm mà đúng.',
  'Ngày nào cũng ghé à? Tinh thần này tôi thích!',
  'Push-up và Lat Pull Down đều dùng tay đấy. Tay mà yếu thì làm gì cũng khó.',
  'Thử thách cuối sẽ dùng đến mọi nhóm cơ. Đừng bỏ sót nhóm nào.',
  'Nghe nói bên Athens có ông giáo sư hay nói về "điểm nút"... tôi thì chỉ biết điểm nút là lúc tạ rơi.',
  'Người ta bảo tôi là tả khuynh vì hay đòi tăng tạ. Không, tôi chỉ biết cơ thể cậu sẵn sàng rồi.',
  'Cậu đã tới đây nhiều lần lắm rồi. Sắp có bước nhảy về chất đấy!',
  'Còn 1 điểm à? Đừng lãng phí, làm thêm bài nữa nào!',
];

export const PROFESSOR_LINES: string[] = [
  'Chào mừng tới Athens. Tri thức cũng cần tích luỹ như cơ bắp vậy.',
  'Hôm nay ta học gì? Chất, Lượng, hay dám thử "Điểm nút & Bước nhảy"?',
  'Đề thi cuối rút ngẫu nhiên từ mọi khối. Đừng bỏ trống khối nào.',
  'Ngươi lại tới! Sự lặp lại có chủ đích chính là tích luỹ về lượng.',
  'Nước sôi ở 100 độ — nhưng phải đun từ 1 độ đầu tiên.',
  'Tay to mà đầu rỗng thì thử thách cuối chỉ qua được một nửa thôi.',
  'Ta nghe nói huấn luyện viên bên kia hay hét "giữ form". Hắn nói đúng: hình thức tốt mới có nội dung tốt.',
  'Hai câu đúng liên tiếp — ngươi sẽ được huy hiệu Triết gia trong ngày hôm nay.',
  'Đọc kỹ đáp án sai. Sai là nơi tri thức về chất xuất hiện.',
  'Ngày 10 sắp tới. Ngươi sẵn sàng cho bước nhảy chưa?',
];

/** Flavor text cuối ngày theo tỉ lệ gym/học trong ngày */
export function dayFlavor(gym: number, study: number): string {
  if (gym === 5) return 'Một ngày toàn tạ! Cơ bắp lên tiếng, còn sách thì im lặng chờ.';
  if (study === 5) return 'Một ngày toàn sách! Đầu óc sáng bừng, tạ thì phủ bụi.';
  if (gym >= 4) return 'Nghiêng về WheyStation. Huấn luyện viên hài lòng, giáo sư nhíu mày nhẹ.';
  if (study >= 4) return 'Nghiêng về Athens. Giáo sư gật gù, huấn luyện viên xoa tạ chờ.';
  if (gym === 3) return 'Hơi nghiêng về gym, nhưng vẫn có chỗ cho tri thức. Ổn đấy!';
  if (study === 3) return 'Hơi nghiêng về học, nhưng cơ bắp không bị bỏ rơi. Ổn đấy!';
  return 'Cân bằng hoàn hảo — thân thể và tinh thần cùng tiến.';
}

/** Nhật ký huấn luyện tự sinh cuối ngày */
export function dayDiary(day: number, gym: number, study: number, weather: string): string {
  const w = weather === 'rain' ? 'Trời mưa lất phất.' : weather === 'wind' ? 'Gió thổi qua quảng trường.' : 'Trời nắng đẹp.';
  const parts: string[] = [];
  if (gym > 0) parts.push(`${gym} lượt tập ở WheyStation`);
  if (study > 0) parts.push(`${study} lượt học ở Athens`);
  const act = parts.join(' và ');
  const mood = [
    'Mệt nhưng vui.',
    'Cảm thấy mình đang tích luỹ điều gì đó.',
    'Chưa thấy khác biệt rõ rệt, nhưng tin là sẽ có bước nhảy.',
    'Bắt đầu quen với nhịp điệu này.',
    'Hôm nay có lúc muốn bỏ cuộc, nhưng đã hoàn thành.',
    'Nhìn lại thấy mình đã khác ngày đầu.',
    'Tay hơi mỏi, đầu hơi đầy, tim rất vững.',
    'Mỗi điểm tiêu đi là một hạt cát trong đồng hồ.',
    'Sắp tới ngày quyết định rồi.',
    'Ngày cuối. Lượng đã đủ chưa? Mai sẽ biết.',
  ][Math.min(day - 1, 9)];
  return `Ngày ${day}: ${w} ${act}. ${mood}`;
}

export const BOSS_LINES = {
  intro: [
    'Ta là VÒNG XOÁY BIỆN CHỨNG. Mười ngày tích luỹ của ngươi... hãy chứng minh nó đủ để đổi chất!',
  ],
  phase1: 'PHA 1 — LƯỢNG ĐỔI DẪN ĐẾN CHẤT ĐỔI',
  phase1Hint: 'Trả lời đúng để làm chậm thanh Năng lượng. Khi có "BÙNG NỔ", bấm SPACE liên tục!',
  phase2: 'PHA 2 — ĐẤU TRANH GIỮA CÁC MẶT ĐỐI LẬP',
  phase2Hint: 'Bên trái: bấm SPACE khi con trỏ vào vùng xanh. Bên phải: chọn đáp án bằng chuột hoặc phím 1–4.',
  phase3: 'PHA 3 — PHỦ ĐỊNH CỦA PHỦ ĐỊNH',
  phase3Hint: 'Dùng chính thành quả 10 ngày: mỗi lần tập trừ 1 điểm nhóm cơ liên quan. Giải đúng cả 5 câu.',
  win: 'Lượng đã đủ. Chất đã đổi. Ngươi không còn là kẻ bước vào đây 10 ngày trước.',
  lose: 'Lượng chưa đủ để đổi chất. Nhưng phủ định không phải là kết thúc — hãy quay lại.',
};
