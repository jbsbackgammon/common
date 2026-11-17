/* Shared JBS naming rules for saved-setting lists and downloadable files.
 * Classic script; no dependencies. https://jbsbackgammon.github.io/common/naming.js
 */
(function (global) {
  'use strict';

  const cleanText = (value) => String(value ?? '').trim();
  const pad2 = (number) => String(number).padStart(2, '0');

  // A player pair is a single segment; the event fields use underscores.
  function eventParts({ edition, title, round, topName, bottomName } = {}) {
    const players = [topName, bottomName].map(cleanText).filter(Boolean).join('-');
    return [edition, title, round, players].map(cleanText).filter(Boolean);
  }

  function formatEventName(details) {
    return eventParts(details).join('_');
  }

  function formatSavedAt(value) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ` +
      `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }

  // Example: 2026-11-17 14:49:00・JBS 第15回_新鋭戦_決勝_上選手-下選手
  function formatSavedLabel({ savedAt, ...details } = {}) {
    return [formatSavedAt(savedAt), formatEventName(details)].filter(Boolean).join('・');
  }

  // Preserve names while removing only characters forbidden in common OS filenames.
  function safeFilenamePart(value) {
    return cleanText(value).replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '-')
      .replace(/\s+/g, ' ').replace(/^[.\s]+|[.\s]+$/g, '');
  }

  // Example: 配信盤面_JBS 第15回_新鋭戦_決勝_上選手-下選手.json
  function makeFileName({ prefix, extension = 'json', ...details } = {}) {
    const segments = [prefix, ...eventParts(details)].map(safeFilenamePart).filter(Boolean);
    const suffix = safeFilenamePart(String(extension).replace(/^\./, '')) || 'json';
    return (segments.join('_') || 'JBS') + '.' + suffix;
  }

  global.JBSNaming = Object.freeze({
    version: 1, formatEventName, formatSavedAt, formatSavedLabel, makeFileName
  });
})(window);
