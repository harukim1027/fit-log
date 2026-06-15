import WidgetKit
import SwiftUI

// 위젯 익스텐션 진입점. 익스텐션 deployment target이 16.2이므로
// Live Activity(ActivityConfiguration) 위젯만 번들에 포함한다.
@main
struct RestTimerWidgetBundle: WidgetBundle {
  var body: some Widget {
    RestTimerLiveActivity()
  }
}
