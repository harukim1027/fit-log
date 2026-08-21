import type { StorybookConfig } from "@storybook/react-native-web-vite";

const config: StorybookConfig = {
  stories: ["../design-system/**/*.stories.@(js|jsx|ts|tsx|mdx)"],
  // Storybook 9에서 essentials(controls/actions/backgrounds/viewport 등)는 코어에 통합돼
  // 별도 패키지가 없다. addon-viewport / addon-essentials를 명시하면 설치 오류가 난다.
  addons: ["@storybook/addon-links", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-native-web-vite",
    options: {},
  },
};

export default config;
