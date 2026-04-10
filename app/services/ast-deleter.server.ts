import { toLiquidHtmlAST } from '@shopify/liquid-html-parser';
import { logger } from "../lib/logger.server";

export interface AstDeletionResult {
  modifiedContent: string;
  deletedNodeCount: number;
}

/**
 * Parses Shopify Liquid HTML into an AST and performs safe Soft-Deletions 
 * by wrapping offending nodes in Liquid Comments.
 */
export function softDeleteGhostNodes(
  liquidSource: string, 
  targets: string[] = ['judgeme_core', 'bold-options.js', 'jquery']
): AstDeletionResult {
  
  let ast: any;
  try {
    ast = toLiquidHtmlAST(liquidSource);
  } catch (error) {
    logger.error("Failed to parse Liquid file into AST:", error);
    throw new Error("Invalid Liquid Syntax - Parser failed to construct AST.");
  }

  const nodesToRemove: { start: number; end: number; name: string }[] = [];

  // Recursive AST Traversal to find orphaned or legacy nodes
  function walk(node: any) {
    if (!node || typeof node !== 'object') return;

    // 1. Check Liquid Tags (e.g. {% include 'judgeme_core' %})
    if (node.type === 'LiquidTag' && (node.name === 'include' || node.name === 'render')) {
      if (typeof node.markup === 'string') {
        if (targets.some(t => node.markup.includes(t))) {
          nodesToRemove.push({ start: node.position.start, end: node.position.end, name: `LiquidTag: ${node.markup}` });
        }
      }
    }

    // 2. Check HTML Script Elements (e.g. <script src="bold-options.js"></script>)
    if (node.type === 'HtmlElement' && node.name === 'script') {
        const srcAttr = node.attributes?.find((a: any) => a.name === 'src' || (Array.isArray(a.name) && a.name.join('') === 'src'));
        
        if (srcAttr && srcAttr.value) {
            // The value might be an array of TextNode/VariableNode depending on the parser
            const extractStr = Array.isArray(srcAttr.value) ? 
                srcAttr.value.map((v:any) => v.value || v.source || '').join('') : 
                String(srcAttr.value);

            if (targets.some(t => extractStr.includes(t))) {
                nodesToRemove.push({ start: node.position.start, end: node.position.end, name: `Script: ${extractStr}` });
            }
        }
    }

    // Child Traversal
    for (const key of Object.keys(node)) {
        if (Array.isArray(node[key])) {
            node[key].forEach(walk);
        } else if (typeof node[key] === 'object') {
            walk(node[key]);
        }
    }
  }

  walk(ast);

  if (nodesToRemove.length === 0) {
    return { modifiedContent: liquidSource, deletedNodeCount: 0 };
  }

  // Sort descending by position.start!
  // This is CRITICAL. Slicing from bottom-to-top means earlier position indices remain valid.
  nodesToRemove.sort((a, b) => b.start - a.start);

  let newSource = liquidSource;
  for (const node of nodesToRemove) {
    const before = newSource.substring(0, node.start);
    const target = newSource.substring(node.start, node.end);
    const after = newSource.substring(node.end);
    
    // Soft Delete: Comment out with a specific EcoSync tag
    newSource = `${before}{% comment %}EcoSync Soft-Deleted: \n${target}\n{% endcomment %}${after}`;
    logger.info(`AST Soft-Deleted Node: ${node.name}`);
  }

  return { modifiedContent: newSource, deletedNodeCount: nodesToRemove.length };
}
