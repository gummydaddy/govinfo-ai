// src/pipes/markdown.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  
  transform(value: string): string {
    if (!value) return '';

    let html = value
      // Headers (must be processed before line breaks)
      .replace(/^#### (.*$)/gim, '<h4 class="text-base font-bold text-white mt-3 mb-2">$1</h4>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-white mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-[#D32F2F] mt-5 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-[#D32F2F] mt-6 mb-4">$1</h1>')
      
      // Bold
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white font-bold">$1</strong>')
      .replace(/\_\_(.*?)\_\_/gim, '<strong class="text-white font-bold">$1</strong>')
      
      // Italic
      .replace(/\*(.*?)\*/gim, '<em class="text-gray-300 italic">$1</em>')
      .replace(/\_(.*?)\_/gim, '<em class="text-gray-300 italic">$1</em>')
      
      // Code blocks
      .replace(/```(.*?)```/gims, '<pre class="bg-[#111] border border-gray-700 p-3 my-3 overflow-x-auto"><code class="text-gray-300 font-mono text-sm">$1</code></pre>')
      
      // Inline code
      .replace(/`(.*?)`/gim, '<code class="bg-[#111] text-[#D32F2F] px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      
      // Unordered lists
      .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc text-gray-300 mb-1 leading-relaxed">$1</li>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc text-gray-300 mb-1 leading-relaxed">$1</li>')
      
      // Ordered lists
      .replace(/^\d+\. (.*$)/gim, '<div class="ml-0 mb-2 font-mono text-sm text-gray-200"><span class="text-[#D32F2F] mr-2 font-bold">➜</span>$1</div>')
      
      // Blockquotes
      .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-[#D32F2F] pl-4 my-3 text-gray-400 italic">$1</blockquote>')
      
      // Horizontal rule
      .replace(/^---$/gim, '<hr class="border-gray-700 my-4">')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2" target="_blank" class="text-[#D32F2F] hover:text-red-400 underline">$1</a>')
      
      // Tables (basic support)
      .replace(/\|(.+)\|/gim, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        const cellsHtml = cells.map(c => `<td class="border border-gray-700 px-3 py-2 text-sm">${c.trim()}</td>`).join('');
        return `<tr>${cellsHtml}</tr>`;
      })
      
      // Line breaks (must be last)
      .replace(/\n/gim, '<br>');

    // Wrap tables
    html = html.replace(/(<tr>.*<\/tr>)/gims, '<table class="table-auto border-collapse border border-gray-700 my-4 w-full">$1</table>');

    return html;
  }
}
