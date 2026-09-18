/** Thoại NPC và flavor text (mục 6–7 tài liệu thiết kế) */
import { BALANCE } from './balance';

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
  'Ngày cuối sắp tới. Ngươi sẵn sàng cho bước nhảy chưa?',
];

/** Flavor text cuối ngày theo tỉ lệ gym/học trong ngày */
export function dayFlavor(gym: number, study: number): string {
  const total = gym + study || 1;
  const g = gym / total;
  if (g === 1) return 'Một ngày toàn tạ! Cơ bắp lên tiếng, còn sách thì im lặng chờ.';
  if (g === 0) return 'Một ngày toàn sách! Đầu óc sáng bừng, tạ thì phủ bụi.';
  if (g >= 0.75) return 'Nghiêng hẳn về WheyStation. Huấn luyện viên hài lòng, giáo sư nhíu mày nhẹ.';
  if (g <= 0.25) return 'Nghiêng hẳn về Athens. Giáo sư gật gù, huấn luyện viên xoa tạ chờ.';
  if (g > 0.5) return 'Hơi nghiêng về gym, nhưng vẫn có chỗ cho tri thức. Ổn đấy!';
  if (g < 0.5) return 'Hơi nghiêng về học, nhưng cơ bắp không bị bỏ rơi. Ổn đấy!';
  return 'Cân bằng hoàn hảo — thân thể và tinh thần cùng tiến.';
}

/** Nhật ký huấn luyện tự sinh cuối ngày */
export function dayDiary(day: number, gym: number, study: number, weather: string): string {
  const w = weather === 'rain' ? 'Trời mưa lất phất.' : weather === 'wind' ? 'Gió thổi qua quảng trường.' : 'Trời nắng đẹp.';
  const parts: string[] = [];
  if (gym > 0) parts.push(`${gym} lượt tập ở WheyStation`);
  if (study > 0) parts.push(`${study} lượt học ở Athens`);
  const act = parts.join(' và ');
  const moods = [
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
  ];
  const idx = Math.round(((day - 1) / Math.max(1, BALANCE.totalDays - 1)) * (moods.length - 1));
  const mood = moods[Math.min(moods.length - 1, Math.max(0, idx))];
  return `Ngày ${day}: ${w} ${act}. ${mood}`;
}

export const BOSS_LINES = {
  intro: [
    `Ta là VÒNG XOÁY BIỆN CHỨNG. ${BALANCE.totalDays} ngày tích luỹ của ngươi... hãy chứng minh nó đủ để đổi chất!`,
  ],
  /** Phase tiêu hao A: câu hỏi + bùng nổ thể lực */
  quantity: 'LƯỢNG ĐỔI DẪN ĐẾN CHẤT ĐỔI',
  quantityHint: 'Trả lời đúng để làm chậm thanh Năng lượng. Khi có "BÙNG NỔ", bấm SPACE liên tục!',
  /** Phase tiêu hao B: chia đôi thể chất / kiến thức */
  struggle: 'ĐẤU TRANH GIỮA CÁC MẶT ĐỐI LẬP',
  struggleHint: 'Bên trái: bấm SPACE khi con trỏ vào vùng xanh. Bên phải: chọn đáp án bằng chuột hoặc phím 1–4.',
  /** Phase cuối: dùng phần chỉ số còn lại */
  negation: 'PHỦ ĐỊNH CỦA PHỦ ĐỊNH',
  negationHint: 'Chỉ số hiện tại = tích luỹ − đã tiêu hao ở hai phase trước. Mỗi lần tập trừ 1 điểm nhóm cơ liên quan. Giải đúng cả 5 câu.',
  drainRule: 'Mỗi lượt tập trừ 1 điểm các nhóm cơ liên quan · mỗi câu hỏi trừ 1 điểm khối đó. Thất bại / sai → trừ thêm 1 ở MỌI nhóm còn lại.',
  win: 'Lượng đã đủ. Chất đã đổi. Ngươi không còn là kẻ bước vào đây ngày đầu tiên.',
  lose: 'Lượng chưa đủ để đổi chất. Nhưng phủ định không phải là kết thúc — hãy quay lại.',
};
