import { defineConfig } from 'vitepress'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  srcDir: 'src',
  base: isProd ? '/mikros-docs/' : '/',

  lang: 'en-US',
  title: 'Mikros',
  description: 'An opinionated framework for Go and Rust services',

  themeConfig: {
    logo: 'https://avatars.githubusercontent.com/u/146955355',
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Go', link: '/go/' },
      { text: 'Rust', link: '/rust/' },
      {
        text: 'Tools',
        items: [
          { text: 'CLI', link: '/cli/' },
          { text: 'Protobuf', link: '/protobuf/' },
        ]
      },
      { text: 'Contribute', link: '/contribute/' }
    ],
    sidebar: {
      '/guide/': [
        { text: 'What is Mikros', link: '/guide/' },
        { text: 'Service definitions', link: '/guide/service-toml' },
        { text: 'Lifecycle', link: '/guide/lifecycle' },
        { text: 'Extending', link: '/guide/extending' },
      ],
      '/go/': [
        { text: 'Quickstart', link: '/go/quickstart' },
        { text: 'Overview', link: '/go/overview' },
        { text: 'Features', link: '/go/features' },
        { text: 'New service type', link: '/go/new-service-type' },
        { text: 'Testing', link: '/go/testing' },
        { text: 'Examples', link: '/go/examples' },
        { text: 'Roadmap', link: '/go/roadmap' },
        { text: 'Reference (pkg.go.dev)', link: 'https://pkg.go.dev/github.com/mikros-dev/mikros' },
      ],
      '/rust/': [
        { text: 'Quickstart', link: '/rust/quickstart' },
        { text: 'Overview', link: '/go/overview' },
        { text: 'Features', link: '/rust/features' },
        { text: 'New service type', link: '/rust/new-service-type' },
        { text: 'Macros', link: '/rust/macros' },
        { text: 'Examples', link: '/rust/examples' },
        { text: 'Roadmap', link: '/rust/roadmap' },
        { text: 'Reference (docs.rs)', link: 'https://docs.rs/mikros' },
      ],
      '/protobuf': [
        { text: 'Extensions', link: '/protobuf/extensions' },
        { text: 'OpenAPI', link: '/protobuf/openapi' },
      ],
      '/contribute/': [
        { text: 'How to contribute', link: '/contribute/' },
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/mikros-dev' },
    ],
    editLink: {
      pattern: 'https://github.com/mikros-dev/mikros-docs/edit/main/src/:path',
      text: 'Edit this page on GitHub'
    },
    footer: {
      message: 'Mikros is MIT/MPL-2.0 licensed',
      copyright: '© Mikros'
    },
    outline: [2,3]
  },
  head: [
    ['meta', { name: 'theme-color', content: '#0b0f19' }],
    ['link', { rel: 'icon', href: '/favicon.svg' }]
  ],
})
