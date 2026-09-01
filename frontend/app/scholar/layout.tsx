export const metadata = {
  title: 'GeminiSpace | Interactive Introduction',
  description: 'Explore the pre-generated interactive maps, topology graphs, and VLA model Q&A.',
};

export default function ScholarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#ffffff', minHeight: '100vh', width: '100%' }}>
      {children}
    </div>
  );
}
