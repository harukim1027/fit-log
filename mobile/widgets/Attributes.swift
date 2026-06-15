import ActivityKit
import Foundation

// 휴식 타이머 Live Activity 데이터 계약 (JS ↔ Swift 공유)
// - attributes(정적): 활동 시작 시 고정되는 값
// - ContentState(동적): update로 갱신되는 값
struct RestTimerAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    // 휴식 종료 시각. 잠금화면은 Text(timerInterval:)로 이 시각까지 자동 카운트다운한다.
    var endDate: Date
    // 일시정지 여부. true면 카운트다운 대신 pausedRemaining을 고정 표시.
    var isPaused: Bool
    // 일시정지 시점의 남은 초.
    var pausedRemaining: Int
  }

  // 운동 종목명 (활동 동안 고정)
  var exerciseName: String
}
