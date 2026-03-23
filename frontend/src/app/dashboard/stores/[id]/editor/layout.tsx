export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The Puck editor is fullscreen — no dashboard sidebar/header
  return <>{children}</>;
}
