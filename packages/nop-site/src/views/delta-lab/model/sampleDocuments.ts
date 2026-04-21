function svgDataUri(label: string, fill: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240" viewBox="0 0 480 240"><rect width="480" height="240" rx="24" fill="${fill}"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Georgia, serif" font-size="42">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ─── Source 文档 ─────────────────────────────────────────────────────────────

export interface SourceDocument {
  name: string;
  data: Record<string, unknown>;
}

export function createMainSourceSample(): SourceDocument {
  return {
    name: 'main',
    data: {
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
    },
  };
}

export function createUserSourceSample(): SourceDocument {
  return {
    name: 'user',
    data: {
      preferences: {
        theme: 'dark',
        language: 'zh-CN',
        fontSize: 14,
      },
      overrides: {
        displayName: '用户自定义名称',
        accentColor: '#8b5cf6',
      },
      customFields: [
        { name: 'nickname', label: '昵称', type: 'string' },
        { name: 'department', label: '部门', type: 'string' },
      ],
    },
  };
}

export function createTenantSourceSample(): SourceDocument {
  return {
    name: 'tenant',
    data: {
      branding: {
        logo: svgDataUri('TENANT', '#dc2626'),
        primaryColor: '#dc2626',
        companyName: 'Acme Corp',
      },
      policies: {
        maxFields: 20,
        allowCustomTheme: true,
        requiredFields: ['id', 'name'],
      },
    },
  };
}

// ─── 向后兼容：单 source 模式 ────────────────────────────────────────────────

export function createBaseSample(): Record<string, unknown> {
  return createMainSourceSample().data;
}

// ─── Delta 文档 ──────────────────────────────────────────────────────────────

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

/**
 * 多 Source Delta 示例：表达式中引用多个 source。
 */
export function createMultiSourceDeltaSample(): Record<string, unknown> {
  return {
    'user.profile.displayName': {
      $jina: "$user.overrides.displayName != null ? $user.overrides.displayName : (firstName & ' ' & lastName)",
    },
    'appearance.accentColor': {
      $jina: '$user.overrides.accentColor',
    },
    'appearance.logo': {
      $jina: '$tenant.branding.logo',
    },
    'user.profile.theme': {
      $jina: '$user.preferences.theme',
    },
    "fields+[]": {
      $jina: '$user.customFields',
    },
    'branding.companyName': {
      $jina: '$tenant.branding.companyName',
    },
    'branding.primaryColor': {
      $jina: '$tenant.branding.primaryColor',
    },
  };
}

// ─── Pipeline 文档 ───────────────────────────────────────────────────────────

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

/**
 * 多 Source Pipeline 示例：每个 step 可以引用不同 source。
 */
export function createMultiSourcePipelineSample(): Record<string, unknown> {
  return {
    $pipeline: [
      {
        $delta: {
          'user.profile.displayName': {
            $jina: '$user.overrides.displayName',
          },
          'user.profile.theme': {
            $jina: '$user.preferences.theme',
          },
        },
        $comment: 'Step 1: 应用用户偏好覆盖',
      },
      {
        $delta: {
          'branding.logo': {
            $jina: '$tenant.branding.logo',
          },
          'branding.companyName': {
            $jina: '$tenant.branding.companyName',
          },
          'appearance.accentColor': {
            $jina: '$tenant.branding.primaryColor',
          },
        },
        $comment: 'Step 2: 应用租户品牌配置',
      },
      {
        $delta: {
          'fields+[]': {
            $jina: '$user.customFields',
          },
          'summary.mergedBy': 'multi-source-pipeline',
        },
        $comment: 'Step 3: 合并自定义字段',
      },
    ],
  };
}
