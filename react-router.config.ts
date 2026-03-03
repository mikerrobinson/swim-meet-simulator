import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  basename: "/projects/meet-entries/",
  future: {
    v8_viteEnvironmentApi: true,
  },
} satisfies Config;
