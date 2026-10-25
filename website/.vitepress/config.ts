// Product documentation of Typewriter Nocturne, built with VitePress and published to GitHub Pages
// by .github/workflows/pages.yml. English at the root, Simplified Chinese under /zh/.

import { defineConfig } from 'vitepress'

const repo = 'https://github.com/Chaosnap/Typewriter-Nocturne'
const base = '/Typewriter-Nocturne/'

const englishGuide = [
  {
    text: 'Getting started',
    items: [
      { text: 'Install', link: '/guide/getting-started' },
      { text: 'Gallery', link: '/guide/gallery' },
    ],
  },
  {
    text: 'Using it',
    items: [
      { text: 'The stage and quality', link: '/guide/stage' },
      { text: 'The lamp and its cord', link: '/guide/lamp' },
      { text: 'Paper and ink', link: '/guide/paper' },
      { text: 'Type and Nerd Fonts', link: '/guide/type' },
      { text: 'Sounds and input methods', link: '/guide/sounds' },
      { text: 'The Press and the Archive', link: '/guide/press' },
      { text: 'Shortcuts', link: '/guide/shortcuts' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'Settings files', link: '/guide/settings' },
      { text: 'Privacy and security', link: '/guide/privacy' },
      { text: 'Questions', link: '/guide/faq' },
      { text: 'Built in the cloud', link: '/guide/building' },
      { text: 'Changelog', link: '/guide/changelog' },
    ],
  },
]

const chineseGuide = [
  {
    text: '入门',
    items: [
      { text: '安装', link: '/zh/guide/getting-started' },
      { text: '截图', link: '/zh/guide/gallery' },
    ],
  },
  {
    text: '使用',
    items: [
      { text: '舞台与画质', link: '/zh/guide/stage' },
      { text: '台灯与拉绳', link: '/zh/guide/lamp' },
      { text: '纸与墨', link: '/zh/guide/paper' },
      { text: '字体与 Nerd Font', link: '/zh/guide/type' },
      { text: '音效与输入法', link: '/zh/guide/sounds' },
      { text: '印刷机与档案', link: '/zh/guide/press' },
      { text: '快捷键', link: '/zh/guide/shortcuts' },
    ],
  },
  {
    text: '参考',
    items: [
      { text: '设置文件', link: '/zh/guide/settings' },
      { text: '隐私与安全', link: '/zh/guide/privacy' },
      { text: '常见问题', link: '/zh/guide/faq' },
      { text: '云端构建', link: '/zh/guide/building' },
      { text: '更新日志', link: '/zh/guide/changelog' },
    ],
  },
]

export default defineConfig({
  title: 'Typewriter Nocturne',
  description: 'A real terminal with the soul of a writing desk: a 3D typewriter, paper lit by a lamp, the sound of type bars.',
  base,
  cleanUrls: true,
  lastUpdated: true,
  appearance: 'dark',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}images/icon.svg` }],
    ['meta', { name: 'theme-color', content: '#1d1611' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Courier+Prime&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=swap',
      },
    ],
  ],

  themeConfig: {
    logo: '/images/icon.svg',
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: repo }],
    footer: {
      message: 'Released under the MIT licence. Built on <a href="https://github.com/vercel/hyper">Hyper</a>.',
      copyright: '© Typewriter Nocturne contributors',
    },
  },

  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'Gallery', link: '/guide/gallery' },
          { text: 'Demo', link: 'https://chaosnap.github.io/Typewriter-Nocturne/demo/' },
          { text: 'Download', link: `${repo}/releases` },
        ],
        sidebar: { '/guide/': englishGuide },
        editLink: { pattern: `${repo}/edit/main/website/:path`, text: 'Edit this page on GitHub' },
      },
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      description: '一款带着书桌灵魂的真正终端：3D 打字机、被灯照亮的纸张、打字杆的声音。',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/guide/getting-started' },
          { text: '截图', link: '/zh/guide/gallery' },
          { text: '在线演示', link: 'https://chaosnap.github.io/Typewriter-Nocturne/demo/' },
          { text: '下载', link: `${repo}/releases` },
        ],
        sidebar: { '/zh/guide/': chineseGuide },
        outline: { label: '本页目录' },
        lastUpdated: { text: '最后更新于' },
        editLink: { pattern: `${repo}/edit/main/website/:path`, text: '在 GitHub 上编辑此页' },
        docFooter: { prev: '上一页', next: '下一页' },
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '目录',
        darkModeSwitchLabel: '外观',
        footer: {
          message: '以 MIT 许可证发布，基于 <a href="https://github.com/vercel/hyper">Hyper</a>。',
          copyright: '© Typewriter Nocturne 贡献者',
        },
      },
    },
  },
})
