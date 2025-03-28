import { defineConfig, type UserConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar';
import { type VitePressSidebarOptions } from 'vitepress-sidebar/types';
import { withI18n } from 'vitepress-i18n';
import { type VitePressI18nOptions } from 'vitepress-i18n/types';

// Base VitePress configuration
const vitePressConfig: UserConfig = {
  title: 'Mikros',
  description: 'Mikros docs',
  srcDir: './src',
  assetsDir: './public',
  rewrites: {
    'en/:rest*': ':rest*'
  },
  base: '/',
  ignoreDeadLinks: true,
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],
  themeConfig: {
    logo: 'https://avatars.githubusercontent.com/u/146955355',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/mikros-dev' },
    ],
  }
}

const rootLocale = 'en'
const supportedLocales = [rootLocale, 'pt'];
const commonSidebarConfigs: VitePressSidebarOptions = {
  capitalizeFirst: true,
  capitalizeEachWords: true,
  underscoreToSpace: true,
}

const vitePressSidebarConfig: VitePressSidebarOptions[] =
  supportedLocales.map((lang) => {
    return {
      ...commonSidebarConfigs,
      ...(rootLocale === lang ? {} : { basePath: `/${lang}/` }),
      documentRootPath: `src/${lang}`,
      resolvePath: rootLocale === lang ? '/' : `/${lang}/`,
    };
  })

const vitePressI18nConfig: VitePressI18nOptions = {
  locales: supportedLocales,
  rootLocale: rootLocale,
  searchProvider: 'local',
  themeConfig: {
    en: {
      nav: [
        { text: 'Home', link: '/' },
        { text: 'Getting Started', link: '/getting_started/' },
        { text: 'Guides', link: '/guides/service_toml' },
        {
          text: 'Documentation',
          items: [
            { text: 'Core Concepts', link: '/guides/concepts' },
            { text: 'Architecture', link: '/guides/architecture' },
            { text: 'Best Practices', link: '/guides/best_practices' }
          ]
        },
        { text: 'API', link: '/api/' }
      ],
    },
    pt: {
      nav: [
        { text: 'Início', link: '/pt/' },
        { text: 'Primeiros Passos', link: '/pt/getting_started/' },
        { text: 'Guias', link: '/pt/guides/service_toml' },
        {
          text: 'Documentação',
          items: [
            { text: 'Conceitos Básicos', link: '/pt/guides/concepts' },
            { text: 'Arquitetura', link: '/pt/guides/architecture' },
            { text: 'Melhores Práticas', link: '/pt/guides/best_practices' }
          ]
        },
        { text: 'API', link: '/pt/api/' }
      ],
    }
  }
};


// https://vitepress.dev/reference/site-config
export default defineConfig(
  withSidebar(withI18n(vitePressConfig, vitePressI18nConfig), vitePressSidebarConfig)
);
