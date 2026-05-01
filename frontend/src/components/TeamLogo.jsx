const ABBREVS = {
  'Arizona Diamondbacks':  'ari',
  'Atlanta Braves':        'atl',
  'Baltimore Orioles':     'bal',
  'Boston Red Sox':        'bos',
  'Chicago Cubs':          'chc',
  'Chicago White Sox':     'cws',
  'Cincinnati Reds':       'cin',
  'Cleveland Guardians':   'cle',
  'Colorado Rockies':      'col',
  'Detroit Tigers':        'det',
  'Houston Astros':        'hou',
  'Kansas City Royals':    'kc',
  'Los Angeles Angels':    'laa',
  'Los Angeles Dodgers':   'lad',
  'Miami Marlins':         'mia',
  'Milwaukee Brewers':     'mil',
  'Minnesota Twins':       'min',
  'New York Mets':         'nym',
  'New York Yankees':      'nyy',
  'Athletics':             'oak',
  'Oakland Athletics':     'oak',
  'Philadelphia Phillies': 'phi',
  'Pittsburgh Pirates':    'pit',
  'San Diego Padres':      'sd',
  'San Francisco Giants':  'sf',
  'Seattle Mariners':      'sea',
  'St. Louis Cardinals':   'stl',
  'Tampa Bay Rays':        'tb',
  'Texas Rangers':         'tex',
  'Toronto Blue Jays':     'tor',
  'Washington Nationals':  'wsh',
};

export function teamLogoUrl(name) {
  const abbr = ABBREVS[name];
  return abbr ? `https://a.espncdn.com/i/teamlogos/mlb/500/${abbr}.png` : null;
}

export default function TeamLogo({ name, size = 24, style = {} }) {
  const url = teamLogoUrl(name);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      style={{ objectFit: 'contain', flexShrink: 0, display: 'inline-block', ...style }}
    />
  );
}
