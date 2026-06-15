import ExpoModulesCore
import ActivityKit

// 메인 앱 타깃에 컴파일되는 JS 브릿지(Expo Module).
// react-native-widget-extension 플러그인이 이 파일을 패키지 ios로 복사한다.
// 클래스/모듈명은 패키지 expo-module.config.json("ReactNativeWidgetExtensionModule")과
// 반드시 일치해야 한다.
public class ReactNativeWidgetExtensionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReactNativeWidgetExtension")

    // Live Activity 사용 가능 여부 (iOS 16.2+ & 사용자 허용)
    Function("areActivitiesEnabled") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    // 휴식 시작: 기존 활동을 정리하고 새 Live Activity 요청
    // JS: startActivity(exerciseName, endDateMs, isPaused, pausedRemaining)
    Function("startActivity") { (exerciseName: String, endDateMs: Double, isPaused: Bool, pausedRemaining: Int) -> Void in
      if #available(iOS 16.2, *) {
        // 중복 활동 방지
        for activity in Activity<RestTimerAttributes>.activities {
          Task { await activity.end(nil, dismissalPolicy: .immediate) }
        }

        let endDate = Date(timeIntervalSince1970: endDateMs / 1000.0)
        let attributes = RestTimerAttributes(exerciseName: exerciseName)
        let state = RestTimerAttributes.ContentState(
          endDate: endDate, isPaused: isPaused, pausedRemaining: pausedRemaining
        )
        let content = ActivityContent(state: state, staleDate: endDate.addingTimeInterval(60))

        do {
          _ = try Activity.request(attributes: attributes, content: content)
        } catch {
          // 무시 (권한/한도 등)
        }
      }
    }

    // 휴식 갱신: 일시정지/재개/시간연장
    // JS: updateActivity(endDateMs, isPaused, pausedRemaining)
    Function("updateActivity") { (endDateMs: Double, isPaused: Bool, pausedRemaining: Int) -> Void in
      if #available(iOS 16.2, *) {
        let endDate = Date(timeIntervalSince1970: endDateMs / 1000.0)
        let state = RestTimerAttributes.ContentState(
          endDate: endDate, isPaused: isPaused, pausedRemaining: pausedRemaining
        )
        let content = ActivityContent(state: state, staleDate: endDate.addingTimeInterval(60))
        Task {
          for activity in Activity<RestTimerAttributes>.activities {
            await activity.update(content)
          }
        }
      }
    }

    // 휴식 종료/취소: 모든 활동 즉시 제거
    // JS: endActivity()
    Function("endActivity") { () -> Void in
      if #available(iOS 16.2, *) {
        Task {
          for activity in Activity<RestTimerAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
          }
        }
      }
    }
  }
}
