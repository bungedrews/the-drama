import './globals.css';

export const metadata = {
  title: 'The Drama — Film Club',
  description: 'A digital souvenir for The Drama meetup, hosted by Lakaii, Imogen & Sophie.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=EB+Garamond:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
