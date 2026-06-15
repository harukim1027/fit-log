import ActivityKit
import WidgetKit
import SwiftUI

// 휴식 타이머 Live Activity — 잠금화면 + 다이나믹 아일랜드.
// 위젯 익스텐션 타깃(deployment target 16.2)에 컴파일된다.
struct RestTimerLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: RestTimerAttributes.self) { context in
      // ── 잠금화면 / 배너 ──
      HStack(alignment: .center) {
        VStack(alignment: .leading, spacing: 4) {
          Label("휴식 타이머", systemImage: "timer")
            .font(.caption)
            .foregroundColor(.orange)
          Text(context.attributes.exerciseName)
            .font(.headline)
            .foregroundColor(.white)
            .lineLimit(1)
          if context.state.isPaused {
            Text("일시정지됨")
              .font(.caption2)
              .foregroundColor(.orange)
          }
        }
        Spacer()
        timerView(context: context, font: .system(size: 36, weight: .bold, design: .rounded))
          .foregroundColor(context.state.isPaused ? .orange : .white)
      }
      .padding()
      .activityBackgroundTint(Color.black.opacity(0.6))
      .activitySystemActionForegroundColor(Color.white)
    } dynamicIsland: { context in
      DynamicIsland {
        // ── 확장 표시 ──
        DynamicIslandExpandedRegion(.leading) {
          Label("휴식", systemImage: "timer")
            .font(.caption2)
            .foregroundColor(.orange)
        }
        DynamicIslandExpandedRegion(.trailing) {
          timerView(context: context, font: .system(size: 18, weight: .semibold, design: .rounded))
            .foregroundColor(.white)
            .frame(maxWidth: 70)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.attributes.exerciseName)
            .font(.caption)
            .foregroundColor(.white.opacity(0.85))
            .lineLimit(1)
        }
        DynamicIslandExpandedRegion(.bottom) {
          if context.state.isPaused {
            Text("일시정지됨")
              .font(.caption2)
              .foregroundColor(.orange)
          }
        }
      } compactLeading: {
        Image(systemName: "timer").foregroundColor(.orange)
      } compactTrailing: {
        timerView(context: context, font: .system(.body, design: .rounded))
          .foregroundColor(.white)
          .frame(maxWidth: 58)
      } minimal: {
        Image(systemName: "timer").foregroundColor(.orange)
      }
      .keylineTint(.orange)
      .widgetURL(URL(string: "fitlog://workout"))
    }
  }

  // 일시정지면 고정 표시, 아니면 endDate까지 자동 카운트다운(Text(timerInterval:)).
  @ViewBuilder
  private func timerView(context: ActivityViewContext<RestTimerAttributes>, font: Font) -> some View {
    if context.state.isPaused {
      Text(timeString(context.state.pausedRemaining))
        .font(font)
        .monospacedDigit()
    } else {
      Text(timerInterval: Date.now...context.state.endDate, countsDown: true)
        .font(font)
        .monospacedDigit()
        .multilineTextAlignment(.trailing)
    }
  }

  private func timeString(_ seconds: Int) -> String {
    let s = max(0, seconds)
    return String(format: "%d:%02d", s / 60, s % 60)
  }
}
