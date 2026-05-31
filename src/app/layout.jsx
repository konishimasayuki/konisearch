export const metadata = {
  title: "コニサーチ",
  description: "人物・法人情報統合検索システム",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
