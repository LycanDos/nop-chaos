function svgDataUri(label: string, fill: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240" viewBox="0 0 480 240"><rect width="480" height="240" rx="24" fill="${fill}"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Georgia, serif" font-size="42">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createBaseSample(): Record<string, unknown> {
  return {
    user: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      profile: {
        name: 'Ada',
        avatar: svgDataUri('BASE', '#0f766e'),
        displayName: 'Ada',
      },
      website: 'https://jsonata.org/',
    },
    images: {
      hero: svgDataUri('HERO', '#1d4ed8'),
      gallery: [svgDataUri('A', '#0ea5e9'), svgDataUri('B', '#f97316')],
    },
    appearance: {
      accentColor: '#2563eb',
      warningColor: '#f97316',
      palette: ['#0f766e', '#2563eb', '#7c3aed'],
    },
    fields: [
      { name: 'id', label: 'ID', type: 'string' },
      { name: 'age', label: 'Age', type: 'int', required: false },
      { name: 'gender', label: 'Gender', type: 'string' },
    ],
    sections: [{ title: 'Overview', subtitle: 'Legacy subtitle' }],
    items: [{ amount: 10 }, { amount: 20 }, { amount: 35 }],
    resources: [
      {
        title: 'JSONata',
        url: 'https://docs.jsonata.org/overview.html',
        color: '#14b8a6',
      },
      {
        title: 'Nop',
        url: 'https://github.com/entropy-cloud/nop-entropy',
        color: '#8b5cf6',
      },
    ],
    links: ['https://jsonata.org/', 'https://docs.jsonata.org/string-functions'],
  };
}

export function createDeltaSample(): Record<string, unknown> {
  return {
    'user.profile.displayName': {
      $jina: "$base.user.firstName & ' ' & $base.user.lastName",
    },
    'user.profile.avatar': svgDataUri('DELTA', '#7c2d12'),
    "fields[name='age'].label": '年龄',
    "fields+>[name='age']": {
      name: 'ageUnit',
      label: '年龄单位',
      type: 'string',
    },
    'sections[0].subtitle-': true,
    'summary.total': {
      $jmes: '_sum(items[].amount)',
    },
    'summary.generatedBy': {
      $java: 'com.demo.delta.PreviewFacade#buildSummary',
    },
    'summary.query': {
      $sql: 'select id, name from nop_user where status = 1 order by id desc',
    },
    'summary.docsUrl': 'https://docs.jsonata.org/string-functions',
    'summary.referenceLinks': ['https://github.com/jsonata-js/jsonata', 'https://www.json.org/json-en.html'],
    'summary.palette': ['#f59e0b', '#10b981', '#0ea5e9'],
    'appearance.accentColor': '#0f766e',
  };
}

export function createPipelineSample(): Record<string, unknown> {
  return {
    $pipeline: [
      {
        $delta: {
          'user.profile.name': 'Grace Hopper',
        },
      },
      {
        $delta: {
          'summary.displayName': {
            $jina: "$base.user.profile.name & ' / pipeline'",
          },
          'summary.heroImage': svgDataUri('PIPE', '#7e22ce'),
          'summary.primaryLink': 'https://sql-formatter-org.github.io/sql-formatter/',
          'appearance.warningColor': '#dc2626',
        },
      },
      {
        $delta: {
          'fields+[]': {
            name: 'pipelineNote',
            label: 'Pipeline Note',
            type: 'string',
          },
          'resources+[]': {
            title: 'Preview Gallery',
            url: 'https://www.example.com/',
            color: '#0891b2',
          },
        },
      },
    ],
  };
}
