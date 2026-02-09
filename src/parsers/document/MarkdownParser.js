/**
 * Markdown解析器
 * 支持 .md 格式
 */
import { BaseParser } from '../BaseParser.js';

export class MarkdownParser extends BaseParser {
  /**
   * 解析Markdown文件
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parse(fileData) {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(fileData);
    
    const lines = text.split('\n');
    const structure = this.parseStructure(lines);
    
    return {
      type: 'markdown',
      content: text,
      structure: structure,
      metadata: {
        charset: 'UTF-8',
        lineCount: lines.length,
        headingCount: structure.headings.length,
        codeBlockCount: structure.codeBlocks.length,
        linkCount: structure.links.length
      }
    };
  }

  /**
   * 解析Markdown结构
   * @param {Array<string>} lines - 文本行数组
   * @returns {Object} 结构化数据
   */
  parseStructure(lines) {
    const headings = [];
    const codeBlocks = [];
    const links = [];
    const tables = [];
    
    let inCodeBlock = false;
    let codeBlockStart = 0;
    let codeBlockLang = '';
    
    lines.forEach((line, index) => {
      // 解析标题
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        headings.push({
          level: headingMatch[1].length,
          text: headingMatch[2].trim(),
          line: index + 1
        });
      }
      
      // 解析代码块
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockStart = index;
          codeBlockLang = line.slice(3).trim();
        } else {
          inCodeBlock = false;
          codeBlocks.push({
            language: codeBlockLang,
            startLine: codeBlockStart + 1,
            endLine: index + 1,
            lines: index - codeBlockStart - 1
          });
        }
      }
      
      // 解析链接
      const linkMatches = line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
      for (const match of linkMatches) {
        links.push({
          text: match[1],
          url: match[2],
          line: index + 1
        });
      }
      
      // 解析表格
      if (line.includes('|')) {
        const cells = line.split('|').filter(cell => cell.trim() !== '');
        if (cells.length > 1) {
          tables.push({
            line: index + 1,
            cellCount: cells.length
          });
        }
      }
    });
    
    return { headings, codeBlocks, links, tables };
  }

  /**
   * 验证Markdown文件
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {boolean} 是否有效
   */
  validate(fileData) {
    // Markdown文件没有固定的Magic Number
    return true;
  }

  /**
   * 获取Markdown文件元数据
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Object} 元数据
   */
  getMetadata(fileData) {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(fileData);
    const lines = text.split('\n');
    const structure = this.parseStructure(lines);
    
    return {
      type: 'markdown',
      charset: 'UTF-8',
      size: fileData.byteLength,
      lineCount: lines.length,
      headingCount: structure.headings.length,
      codeBlockCount: structure.codeBlocks.length,
      linkCount: structure.links.length
    };
  }
}
