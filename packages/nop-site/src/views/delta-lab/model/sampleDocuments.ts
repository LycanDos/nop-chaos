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
    },
    images: {
      hero: svgDataUri('HERO', '#1d4ed8'),
    },
    fields: [
      { name: 'id', label: 'ID', type: 'string' },
      { name: 'age', label: 'Age', type: 'int', required: false },
      { name: 'gender', label: 'Gender', type: 'string' },
    ],
    sections: [
      { title: 'Overview', subtitle: 'Legacy subtitle' },
    ],
    items: [
      { amount: 10 },
      { amount: 20 },
      { amount: 35 },
    ],
  };
}

export function createDeltaSample(): Record<string, unknown> {
  return {
    'user.profile.displayName': {
      $jina: "$base.user.firstName & ' ' & $base.user.lastName",
    },
    'user.profile.avatar': svgDataUri('DELTA', '#7c2d12'),
    'fields[name=\'age\'].label': '年龄',
    'fields+>[name=\'age\']': {
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
        },
      },
      {
        $delta: {
          'fields+[]': {
            name: 'pipelineNote',
            label: 'Pipeline Note',
            type: 'string',
          },
        },
      },
    ],
  };
}
