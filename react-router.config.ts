import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  basename: "/projects/meet-runner/",
  future: {
    v8_viteEnvironmentApi: true,
  },
} satisfies Config;
