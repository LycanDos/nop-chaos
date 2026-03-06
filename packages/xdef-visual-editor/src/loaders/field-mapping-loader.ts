/**
 * 字段映射加载器
 * 支持从多种来源加载字段映射配置
 */

import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as yaml from 'yaml';
import type {
  FieldMapping,
  EntityFieldMap,
  FieldInfo,
  RelationInfo
} from '../types';

/**
 * 字段映射加载器
 */
export class FieldMappingLoader {
  /**
   * 从 ORM 模型加载字段映射
   */
  async loadFromOrmModel(ormPath: string): Promise<FieldMapping> {
    const content = await fs.readFile(ormPath, 'utf-8');
    const $ = cheerio.load(content, { xmlMode: true });

    const mapping: FieldMapping = {
      entities: new Map(),
      globalFields: new Map(),
      pathAliases: new Map()
    };

    // 解析实体和字段
    $('entity').each((_, entity) => {
      const entityName = $(entity).attr('name');
      const tableName = $(entity).attr('tableName');
      const displayName = $(entity).attr('displayName') || entityName;

      const fieldMap: EntityFieldMap = {
        entityName,
        displayName,
        fields: new Map(),
        relations: new Map()
      };

      // 解析字段
      $(entity).find('column').each((_, column) => {
        const name = $(column).attr('name');
        const code = $(column).attr('code');
        const colDisplayName = $(column).attr('displayName') || name;
        const stdDataType = $(column).attr('stdDataType');

        const fieldInfo: FieldInfo = {
          name,
          displayName: colDisplayName,
          type: stdDataType || 'string',
          path: `${entityName}.${name}`,
          aliases: this.generateAliases(name, colDisplayName, code),
          searchable: true
        };

        fieldMap.fields.set(name, fieldInfo);
        mapping.globalFields.set(fieldInfo.path, fieldInfo);
      });

      // 解析关联关系
      $(entity).find('relation').each((_, relation) => {
        const relName = $(relation).attr('name');
        const relType = $(relation).attr('type');
        const refEntity = $(relation).attr('refEntity');
        const relDisplayName = $(relation).attr('displayName') || relName;

        const relationInfo: RelationInfo = {
          name: relName,
          displayName: relDisplayName,
          type: relType as any,
          targetEntity: refEntity || '',
          path: `${entityName}.${relName}`
        };

        fieldMap.relations.set(relName, relationInfo);
      });

      mapping.entities.set(entityName, fieldMap);
    });

    return mapping;
  }

  /**
   * 从配置文件加载字段映射
   */
  async loadFromConfig(configPath: string): Promise<FieldMapping> {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = yaml.parse(content);

    const mapping: FieldMapping = {
      entities: new Map(),
      globalFields: new Map(),
      pathAliases: new Map()
    };

    // 解析配置文件
    if (config.entities) {
      for (const [entityName, entityData] of Object.entries(config.entities)) {
        const entityMap: EntityFieldMap = {
          entityName,
          displayName: (entityData as any).displayName || entityName,
          fields: new Map(),
          relations: new Map()
        };

        if ((entityData as any).fields) {
          for (const [fieldName, fieldData] of Object.entries((entityData as any).fields)) {
            const fieldInfo: FieldInfo = {
              name: fieldName,
              displayName: (fieldData as any).displayName || fieldName,
              type: (fieldData as any).type || 'string',
              path: `${entityName}.${fieldName}`,
              aliases: (fieldData as any).aliases || [],
              searchable: true
            };

            entityMap.fields.set(fieldName, fieldInfo);
            mapping.globalFields.set(fieldInfo.path, fieldInfo);
          }
        }

        mapping.entities.set(entityName, entityMap);
      }
    }

    // 解析路径别名
    if (config.pathAliases) {
      for (const [path, aliases] of Object.entries(config.pathAliases)) {
        mapping.pathAliases.set(path, aliases as string[]);
      }
    }

    return mapping;
  }

  /**
   * 从 API 模型加载字段映射
   */
  async loadFromApiModel(apiPath: string): Promise<FieldMapping> {
    const content = await fs.readFile(apiPath, 'utf-8');
    const $ = cheerio.load(content, { xmlMode: true });

    const mapping: FieldMapping = {
      entities: new Map(),
      globalFields: new Map(),
      pathAliases: new Map()
    };

    // 解析 API 模型
    $('api').each((_, api) => {
      const apiName = $(api).attr('name');
      const displayName = $(api).attr('displayName') || apiName;

      const fieldMap: EntityFieldMap = {
        entityName: apiName,
        displayName,
        fields: new Map(),
        relations: new Map()
      };

      // 解析请求参数
      $(api).find('request > arg').each((_, arg) => {
        const name = $(arg).attr('name');
        const argDisplayName = $(arg).attr('displayName') || name;
        const stdDataType = $(arg).attr('stdDataType');

        const fieldInfo: FieldInfo = {
          name,
          displayName: argDisplayName,
          type: stdDataType || 'string',
          path: `${apiName}.${name}`,
          aliases: this.generateAliases(name, argDisplayName),
          searchable: true
        };

        fieldMap.fields.set(name, fieldInfo);
        mapping.globalFields.set(fieldInfo.path, fieldInfo);
      });

      // 解析响应字段
      $(api).find('response > struct > field').each((_, field) => {
        const name = $(field).attr('name');
        const fieldDisplayName = $(field).attr('displayName') || name;
        const stdDataType = $(field).attr('stdDataType');

        const fieldInfo: FieldInfo = {
          name,
          displayName: fieldDisplayName,
          type: stdDataType || 'string',
          path: `${apiName}.response.${name}`,
          aliases: this.generateAliases(name, fieldDisplayName),
          searchable: true
        };

        fieldMap.fields.set(name, fieldInfo);
        mapping.globalFields.set(fieldInfo.path, fieldInfo);
      });

      mapping.entities.set(apiName, fieldMap);
    });

    return mapping;
  }

  /**
   * 从数据库表结构加载字段映射
   */
  async loadFromDatabase(connection: any): Promise<FieldMapping> {
    const mapping: FieldMapping = {
      entities: new Map(),
      globalFields: new Map(),
      pathAliases: new Map()
    };

    // 假设 connection 是一个数据库连接对象
    // 这里需要根据实际的数据库连接实现来调整
    try {
      const tables = await connection.getTables();

      for (const table of tables) {
        const entityMap: EntityFieldMap = {
          entityName: table.name,
          displayName: table.comment || table.name,
          fields: new Map(),
          relations: new Map()
        };

        // 加载字段
        const columns = await connection.getColumns(table.name);
        for (const column of columns) {
          const fieldInfo: FieldInfo = {
            name: column.name,
            displayName: column.comment || column.name,
            type: this.mapSqlTypeToJavaType(column.type),
            path: `${table.name}.${column.name}`,
            aliases: this.generateAliases(column.name, column.comment),
            searchable: true
          };

          entityMap.fields.set(column.name, fieldInfo);
          mapping.globalFields.set(fieldInfo.path, fieldInfo);
        }

        mapping.entities.set(table.name, entityMap);
      }
    } catch (error) {
      console.error('从数据库加载字段映射失败:', error);
    }

    return mapping;
  }

  /**
   * 从多个来源合并字段映射
   */
  async loadFromMultipleSources(sources: Array<{
    type: 'orm' | 'config' | 'api' | 'database';
    path: string;
    connection?: any;
  }>): Promise<FieldMapping> {
    const mapping: FieldMapping = {
      entities: new Map(),
      globalFields: new Map(),
      pathAliases: new Map()
    };

    for (const source of sources) {
      let sourceMapping: FieldMapping;

      switch (source.type) {
        case 'orm':
          sourceMapping = await this.loadFromOrmModel(source.path);
          break;
        case 'config':
          sourceMapping = await this.loadFromConfig(source.path);
          break;
        case 'api':
          sourceMapping = await this.loadFromApiModel(source.path);
          break;
        case 'database':
          sourceMapping = await this.loadFromDatabase(source.connection!);
          break;
        default:
          continue;
      }

      // 合并映射
      this.mergeMapping(mapping, sourceMapping);
    }

    return mapping;
  }

  /**
   * 合并字段映射
   */
  private mergeMapping(target: FieldMapping, source: FieldMapping): void {
    // 合并实体
    source.entities.forEach((entityMap, entityName) => {
      if (!target.entities.has(entityName)) {
        target.entities.set(entityName, entityMap);
      } else {
        // 合并字段
        const targetEntity = target.entities.get(entityName)!;
        entityMap.fields.forEach((field, fieldName) => {
          if (!targetEntity.fields.has(fieldName)) {
            targetEntity.fields.set(fieldName, field);
          }
        });
      }
    });

    // 合并全局字段
    source.globalFields.forEach((field, path) => {
      if (!target.globalFields.has(path)) {
        target.globalFields.set(path, field);
      }
    });

    // 合并路径别名
    source.pathAliases.forEach((aliases, path) => {
      if (!target.pathAliases.has(path)) {
        target.pathAliases.set(path, aliases);
      } else {
        const existingAliases = target.pathAliases.get(path)!;
        const newAliases = [...existingAliases];
        aliases.forEach(alias => {
          if (!newAliases.includes(alias)) {
            newAliases.push(alias);
          }
        });
        target.pathAliases.set(path, newAliases);
      }
    });
  }

  /**
   * 映射 SQL 类型到 Java 类型
   */
  private mapSqlTypeToJavaType(sqlType: string): string {
    const typeMap: Record<string, string> = {
      'VARCHAR': 'string',
      'CHAR': 'string',
      'TEXT': 'string',
      'INT': 'int',
      'INTEGER': 'int',
      'BIGINT': 'long',
      'DECIMAL': 'decimal',
      'DOUBLE': 'double',
      'FLOAT': 'double',
      'BOOLEAN': 'boolean',
      'DATE': 'date',
      'DATETIME': 'timestamp',
      'TIMESTAMP': 'timestamp',
      'BLOB': 'binary'
    };

    const upperType = sqlType.toUpperCase();
    for (const [key, value] of Object.entries(typeMap)) {
      if (upperType.includes(key)) {
        return value;
      }
    }

    return 'string';
  }

  /**
   * 生成别名
   */
  private generateAliases(name: string, displayName?: string, code?: string): string[] {
    const aliases: string[] = [];

    // 添加中文名
    if (displayName) {
      aliases.push(displayName);
    }

    // 添加列名（转为小写）
    if (code) {
      aliases.push(code.toLowerCase());
      aliases.push(code.replace(/_/g, ''));
    }

    // 添加驼峰形式
    const camelCase = name.replace(/([A-Z])/g, ' $1').toLowerCase();
    aliases.push(camelCase);

    // 添加下划线形式
    const snakeCase = name.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (snakeCase !== name.toLowerCase()) {
      aliases.push(snakeCase);
    }

    return aliases;
  }

  /**
   * 创建默认字段映射
   */
  createDefaultMapping(): FieldMapping {
    return {
      entities: new Map(),
      globalFields: new Map(),
      pathAliases: new Map()
    };
  }

  /**
   * 添加示例数据
   */
  addSampleData(mapping: FieldMapping): void {
    // 添加用户实体示例
    const userEntity: EntityFieldMap = {
      entityName: 'User',
      displayName: '用户',
      fields: new Map(),
      relations: new Map()
    };

    const userFields: FieldInfo[] = [
      { name: 'id', displayName: '用户ID', type: 'long', path: 'User.id', aliases: ['用户ID', 'ID', '编号'], searchable: true },
      { name: 'username', displayName: '用户名', type: 'string', path: 'User.username', aliases: ['用户名', '账号', '登录名'], searchable: true },
      { name: 'password', displayName: '密码', type: 'string', path: 'User.password', aliases: ['密码', '登录密码'], searchable: true },
      { name: 'email', displayName: '邮箱', type: 'string', path: 'User.email', aliases: ['邮箱', '邮件', '电子邮箱'], searchable: true },
      { name: 'phone', displayName: '手机号', type: 'string', path: 'User.phone', aliases: ['手机号', '手机', '电话'], searchable: true },
      { name: 'age', displayName: '年龄', type: 'int', path: 'User.age', aliases: ['年龄', '岁数'], searchable: true },
      { name: 'status', displayName: '状态', type: 'string', path: 'User.status', aliases: ['状态', '用户状态'], searchable: true }
    ];

    userFields.forEach(field => {
      userEntity.fields.set(field.name, field);
      mapping.globalFields.set(field.path, field);
    });

    mapping.entities.set('User', userEntity);

    // 添加订单实体示例
    const orderEntity: EntityFieldMap = {
      entityName: 'Order',
      displayName: '订单',
      fields: new Map(),
      relations: new Map()
    };

    const orderFields: FieldInfo[] = [
      { name: 'id', displayName: '订单ID', type: 'long', path: 'Order.id', aliases: ['订单ID', 'ID'], searchable: true },
      { name: 'userId', displayName: '用户ID', type: 'long', path: 'Order.userId', aliases: ['用户ID', '买家ID'], searchable: true },
      { name: 'total', displayName: '订单总额', type: 'decimal', path: 'Order.total', aliases: ['总额', '金额', '订单金额'], searchable: true },
      { name: 'qty', displayName: '数量', type: 'int', path: 'Order.qty', aliases: ['数量', '订单数量'], searchable: true },
      { name: 'status', displayName: '订单状态', type: 'string', path: 'Order.status', aliases: ['状态', '订单状态'], searchable: true },
      { name: 'discount', displayName: '折扣', type: 'decimal', path: 'Order.discount', aliases: ['折扣', '优惠'], searchable: true },
      { name: 'type', displayName: '订单类型', type: 'string', path: 'Order.type', aliases: ['类型', '订单类型'], searchable: true }
    ];

    orderFields.forEach(field => {
      orderEntity.fields.set(field.name, field);
      mapping.globalFields.set(field.path, field);
    });

    mapping.entities.set('Order', orderEntity);

    // 添加路径别名示例
    mapping.pathAliases.set('user.username', ['用户名', '账号']);
    mapping.pathAliases.set('user.email', ['邮箱', '邮件']);
    mapping.pathAliases.set('order.total', ['订单金额', '金额']);
  }
}