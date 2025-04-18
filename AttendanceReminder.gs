// 出席リンクのベースURL
const BASE_URL = "https://attendance.is.it-chiba.ac.jp/attendance/class_room/";
// 時間割のスプレッドシート
const SHEET_NAME = "Classes";

/**
 * メイン関数（5分おきにトリガーで実行）
 * 現在の日時に一致する講義がある場合、30分前ならDiscordに通知
 */
function autoReminderFromSheet() {
  // スプレッドシートと該当シートの読み込み
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues(); // 全データを2次元配列で取得
  const now = new Date(); // 現在の日時を取得

  // 0=日曜, 1=月曜, ..., 6=土曜
  const currentDay = ["日", "月", "火", "水", "木", "金", "土"][now.getDay()];

  // 現在時刻を分単位に変換
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  // 1行目はヘッダーなので2行目からループ
  for (let i = 1; i < data.length; i++) {
    const [day, period, subject, roomId, startTimeStr] = data[i];

    // 曜日が一致しない場合はスキップ
    if (day !== currentDay) continue;

    // 開始時刻を分単位に変換
    const timeStr = Utilities.formatDate(new Date(startTimeStr), Session.getScriptTimeZone(), "HH:mm");
    const [startHour, startMin] = timeStr.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;


    // 通知の基準時刻 = 開始30分前
    const targetMinutes = startMinutes - 30;

    // 1分以内の誤差であれば通知を送信
    if (Math.abs(currentTimeMinutes - targetMinutes) < 1) {
      sendToDiscord(subject, roomId, `${day}${period}`);
      return; // 通知は1つだけでOKなので終了
    }
  }

  // デバッグ用
  Logger.log("該当する講義なし");
}


function sendToDiscord(subject, roomId, timeLabel) {
  // Webhook URL をスクリプトプロパティから取得
  const WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL");
  const link = `${BASE_URL}${roomId}`;

  const payload = {
    embeds: [
      {
        title: `🔹新着メッセージ: 1`,
        description: `**科目名: ${subject}** 開始時刻30分前になりました`,
        color: 0x3498db,
        fields: [
          {
            name: "🔸曜日時限",
            value: timeLabel,
            inline: true
          },
          {
            name: "🔸開講場所",
            value: roomId.toString(), 
            inline: true
          },
          {
            name: "🔸出席リンク",
            value: `[出撃](${link})`
          }
        ],
        footer: {
          text: "対処してください"
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  UrlFetchApp.fetch(WEBHOOK_URL, options);
}