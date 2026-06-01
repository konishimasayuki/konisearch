export const metadata = {
  title: "コニサーチ",
  description: "人物・法人情報統合検索システム",
  openGraph: {
    title: "コニサーチ",
    description: "人物・法人情報統合検索システム",
    images: [],
  },
  twitter: {
    card: "summary",
    title: "コニサーチ",
    images: [],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <meta property="og:image" content="" />
        <meta name="twitter:image" content="" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
