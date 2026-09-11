import { Component, ElementRef, ViewChild, AfterViewInit, Input, Output, EventEmitter } from '@angular/core';

export interface MiniMapQuery {
  id: string;
  label: string;
}

export interface ParagraphSemanticThemes {
  relevanceLevel: string;
  themes: string[];
  reason: string;
}

export interface MiniMapParagraph {
  id: string;
  title: string;
  content: string;
  similarityScores: { [queryId: string]: number };
  semanticThemes: { [queryId: string]: ParagraphSemanticThemes };
  commonThemesAcrossAllQueries?: string[];
  commonThemesAcrossBothQueries?: string[];
  commonOverlapScore: number;
  explanation: string;
}

export interface MiniMapData {
  type: string;
  queries: MiniMapQuery[];
  paragraphs: MiniMapParagraph[];
}

interface TriangleVertex {
  id: string;
  label: string;
  x: number;
  y: number;
}

interface ParagraphPosition {
  paragraph: MiniMapParagraph;
  x: number;
  y: number;
}

@Component({
  selector: 'app-mind-map',
  templateUrl: './mind-map.component.html',
  styleUrls: ['./mind-map.component.css']
})
export class MindMapComponent implements AfterViewInit {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() centerLabel = 'Query';
  @Input() nodes: any[] = [];
  @Input() treeData: any = null;
  @Input() clusterData: any = null;
  @Input() accentColor = '#6366f1';
  @Output() nodeClicked = new EventEmitter<any>();

  /** Tab: 3-query (triangle) or 2-query (dual) */
  minimapTab: 'three' | 'two' = 'three';

  /** Hardcoded 3-query triangle-query-space mini map data */
  readonly miniMap: { miniMap: MiniMapData } = {
    miniMap: {
      type: 'triangle-query-space',
      queries: [
        { id: 'Q1', label: 'Where was artificial intelligence officially founded?' },
        { id: 'Q2', label: 'What early artificial intelligence was trying to achieve?' },
        { id: 'Q3', label: 'Who were the main people involved in the beginning of artificial intelligence?' }
      ],
      paragraphs: [
        {
          id: 'P1',
          title: '1990s Commercial AI Expansion',
          content: 'In the 1990s, algorithms originally developed by AI researchers began to appear as parts of larger systems. AI had solved many difficult problems and their solutions proved useful in data mining, robotics, logistics, and speech systems. Many researchers avoided the term AI due to the AI Winter and funding concerns.',
          similarityScores: { Q1: 0.42, Q2: 0.58, Q3: 0.47 },
          semanticThemes: {
            Q1: {
              relevanceLevel: 'low-medium',
              themes: [
                'AI as an academic field',
                'Institutional research community',
                'Field identity and terminology',
                'Historical evolution of AI',
                'Transition from research to industry'
              ],
              reason: 'The paragraph discusses AI as an established research field and its evolution, which indirectly relates to its historical founding.'
            },
            Q2: {
              relevanceLevel: 'medium-high',
              themes: [
                'Solving difficult computational problems',
                'Practical applications of AI',
                'Industrial robotics',
                'Data mining and logistics optimization',
                'Speech processing systems',
                'Technological innovation'
              ],
              reason: 'The paragraph explicitly mentions AI solving difficult problems and being applied to robotics, logistics, and speech systems, directly connecting to early AI goals.'
            },
            Q3: {
              relevanceLevel: 'medium',
              themes: [
                'AI researchers and scientists',
                'Academic community',
                'Field contributors',
                'Funding challenges',
                'Rebranding and terminology shifts'
              ],
              reason: "The paragraph refers to AI researchers and scientists, linking semantically to the people involved in AI's early development."
            }
          },
          commonThemesAcrossAllQueries: [
            'AI research community',
            'Evolution of the AI field',
            'Historical development of artificial intelligence'
          ],
          commonOverlapScore: 0.42,
          explanation: "The paragraph overlaps all three queries because it discusses AI as a research field, its researchers, and its practical problem-solving goals. These themes connect semantically to AI's founding, early objectives, and early contributors."
        }
      ]
    }
  };

  /** Hardcoded 2-query dual-query-semantic-space mini map data */
  readonly miniMapTwo: { miniMap: MiniMapData } = {
    miniMap: {
      type: 'dual-query-semantic-space',
      queries: [
        { id: 'Q2', label: 'What early artificial intelligence was trying to achieve?' },
        { id: 'Q3', label: 'Who were the main people involved in the beginning of artificial intelligence?' }
      ],
      paragraphs: [
        {
          id: 'P2',
          title: '1990s AI Research Collaboration and Narrow Focus',
          content: 'There was a widespread realization that many of the problems that AI needed to solve were already being worked on by researchers in fields like statistics, mathematics, electrical engineering, economics or operations research. The shared mathematical language allowed both a higher level of collaboration with more established and successful fields and the achievement of results which were measurable. Another key reason for the success in the 90s was that AI researchers focussed on specific problems with verifiable solutions (an approach later derided as narrow AI). This provided useful tools in the present, rather than speculation about the future.',
          similarityScores: { Q2: 0.64, Q3: 0.56 },
          semanticThemes: {
            Q2: {
              relevanceLevel: 'high',
              themes: [
                'Solving measurable and verifiable problems',
                'Focus on specific practical solutions',
                'Narrow AI approach',
                'Achieving concrete results',
                'Problem-oriented research',
                'Applied mathematical methods'
              ],
              reason: 'The paragraph directly describes AI focusing on solving specific, measurable problems with verifiable solutions, which strongly connects to what early AI aimed to achieve.'
            },
            Q3: {
              relevanceLevel: 'medium-high',
              themes: [
                'AI researchers',
                'Interdisciplinary collaboration',
                'Scientists from statistics and mathematics',
                'Engineering and operations research contributors',
                'Research community integration'
              ],
              reason: "The paragraph discusses collaboration between AI researchers and experts from other scientific fields, connecting to the people and communities involved in AI's development."
            }
          },
          commonThemesAcrossBothQueries: [
            'AI research community',
            'Problem-solving focus',
            'Scientific collaboration',
            'Applied mathematical foundations'
          ],
          commonOverlapScore: 0.56,
          explanation: "The paragraph overlaps both queries because it explains what AI researchers were trying to achieve (solving specific, measurable problems) and also describes the research community and interdisciplinary scientists involved in advancing AI."
        }
      ]
    }
  };

  /** Fixed layout size so triangle/dual map is drawn small and matches the canvas */
  containerWidth = 400;
  containerHeight = 280;
  /** Query vertices (triangle corners or dual endpoints) */
  vertices: TriangleVertex[] = [];
  /** Paragraph positions computed from similarityScores */
  paragraphPositions: ParagraphPosition[] = [];
  /** Triangle path for SVG (3-query only) */
  trianglePath = '';
  /** Line path for 2-query (Q2 left – Q3 right) */
  dualLinePath = '';
  selectedParagraph: MiniMapParagraph | null = null;

  /** Floating detail panel: moveable and resizable */
  detailPanelPosition = { x: 12, y: 12 };
  detailPanelSize = { width: 280, height: 320 };
  detailPanelExpanded = true;
  isDraggingDetail = false;
  isResizingDetail = false;
  private detailDragOffset = { x: 0, y: 0 };
  private detailResizeStart = { x: 0, y: 0, width: 0, height: 0 };

  ngAfterViewInit(): void {
    this.measureContainer();
    this.computeLayout();
    setTimeout(() => this.computeLayout(), 50);
  }

  private measureContainer(): void {
    /* Use fixed size so triangle/dual map is consistently small; canvas CSS matches these. */
    this.containerWidth = 400;
    this.containerHeight = 280;
  }

  private computeLayout(): void {
    this.measureContainer();
    const w = this.containerWidth;
    const h = this.containerHeight;
    const padH = 80;
    const padV = 52;

    if (this.minimapTab === 'two') {
      const data = this.miniMapTwo.miniMap;
      const q = data.queries;
      if (q.length < 2) return;
      const v1 = { x: padH, y: h / 2 };
      const v2 = { x: w - padH, y: h / 2 };
      this.vertices = [
        { id: q[0].id, label: q[0].label, x: v1.x, y: v1.y },
        { id: q[1].id, label: q[1].label, x: v2.x, y: v2.y }
      ];
      this.trianglePath = '';
      this.dualLinePath = `M ${v1.x} ${v1.y} L ${v2.x} ${v2.y}`;
      this.paragraphPositions = data.paragraphs.map((p) => {
        const s0 = p.similarityScores[q[0].id] ?? 0;
        const s1 = p.similarityScores[q[1].id] ?? 0;
        const sum = s0 + s1 || 1;
        const t = s0 / sum;
        const x = v1.x + (v2.x - v1.x) * (1 - t);
        return { paragraph: p, x, y: h / 2 };
      });
      return;
    }

    const data = this.miniMap.miniMap;
    const q = data.queries;
    if (q.length < 3) return;

    const v1 = { x: w / 2, y: padV };
    const v2 = { x: padH, y: h - padV };
    const v3 = { x: w - padH, y: h - padV };

    this.vertices = [
      { id: q[0].id, label: q[0].label, x: v1.x, y: v1.y },
      { id: q[1].id, label: q[1].label, x: v2.x, y: v2.y },
      { id: q[2].id, label: q[2].label, x: v3.x, y: v3.y }
    ];

    this.trianglePath = `M ${v1.x} ${v1.y} L ${v2.x} ${v2.y} L ${v3.x} ${v3.y} Z`;
    this.dualLinePath = '';

    this.paragraphPositions = data.paragraphs.map((p) => {
      const s1 = p.similarityScores['Q1'] ?? 0;
      const s2 = p.similarityScores['Q2'] ?? 0;
      const s3 = p.similarityScores['Q3'] ?? 0;
      const sum = s1 + s2 + s3 || 1;
      const w1 = s1 / sum;
      const w2 = s2 / sum;
      const w3 = s3 / sum;
      const x = w1 * v1.x + w2 * v2.x + w3 * v3.x;
      const y = w1 * v1.y + w2 * v2.y + w3 * v3.y;
      return { paragraph: p, x, y };
    });
  }

  setMinimapTab(tab: 'three' | 'two'): void {
    this.minimapTab = tab;
    this.selectedParagraph = null;
    this.computeLayout();
  }

  /** Common themes list for detail panel (3-query or 2-query) */
  getCommonThemes(p: MiniMapParagraph): string[] {
    return p.commonThemesAcrossAllQueries ?? p.commonThemesAcrossBothQueries ?? [];
  }

  onParagraphClick(p: MiniMapParagraph): void {
    this.selectedParagraph = this.selectedParagraph?.id === p.id ? null : p;
  }

  /** Heatmap color for paragraph by commonOverlapScore (0–1) */
  getParagraphFill(p: MiniMapParagraph): string {
    const t = Math.max(0, Math.min(1, p.commonOverlapScore ?? 0));
    const alpha = 0.35 + 0.6 * t;
    return `rgba(99, 102, 241, ${alpha})`;
  }

  getQueryColor(queryId: string): string {
    const colors: { [key: string]: string } = { Q1: '#6366f1', Q2: '#10b981', Q3: '#f59e0b' };
    return colors[queryId] || '#64748b';
  }

  onDetailPanelHeaderMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    const el = this.containerRef?.nativeElement;
    const rect = el ? el.getBoundingClientRect() : { left: 0, top: 0 };
    this.isDraggingDetail = true;
    this.detailDragOffset = {
      x: (event.clientX - rect.left) - this.detailPanelPosition.x,
      y: (event.clientY - rect.top) - this.detailPanelPosition.y
    };
    document.addEventListener('mousemove', this.onDetailPanelMouseMove);
    document.addEventListener('mouseup', this.onDetailPanelMouseUp);
  }

  onDetailPanelResizeMouseDown(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.isResizingDetail = true;
    this.detailResizeStart = {
      x: event.clientX,
      y: event.clientY,
      width: this.detailPanelSize.width,
      height: this.detailPanelSize.height
    };
    document.addEventListener('mousemove', this.onDetailPanelMouseMove);
    document.addEventListener('mouseup', this.onDetailPanelMouseUp);
  }

  onDetailPanelMouseMove = (event: MouseEvent): void => {
    if (this.isResizingDetail) {
      const deltaX = event.clientX - this.detailResizeStart.x;
      const deltaY = event.clientY - this.detailResizeStart.y;
      const minW = 220;
      const minH = 200;
      const maxW = 420;
      const maxH = 480;
      this.detailPanelSize = {
        width: Math.max(minW, Math.min(maxW, this.detailResizeStart.width + deltaX)),
        height: Math.max(minH, Math.min(maxH, this.detailResizeStart.height + deltaY))
      };
    } else if (this.isDraggingDetail) {
      const containerEl = this.containerRef?.nativeElement;
      const rect = containerEl ? containerEl.getBoundingClientRect() : { left: 0, top: 0, width: 400, height: 400 };
      let newX = (event.clientX - rect.left) - this.detailDragOffset.x;
      let newY = (event.clientY - rect.top) - this.detailDragOffset.y;
      newX = Math.max(0, Math.min(newX, rect.width - this.detailPanelSize.width));
      newY = Math.max(0, Math.min(newY, rect.height - (this.detailPanelExpanded ? this.detailPanelSize.height : 40)));
      this.detailPanelPosition = { x: newX, y: newY };
    }
  };

  onDetailPanelMouseUp = (): void => {
    this.isDraggingDetail = false;
    this.isResizingDetail = false;
    document.removeEventListener('mousemove', this.onDetailPanelMouseMove);
    document.removeEventListener('mouseup', this.onDetailPanelMouseUp);
  };

  toggleDetailPanelExpanded(): void {
    this.detailPanelExpanded = !this.detailPanelExpanded;
  }

  closeDetailPanel(): void {
    this.selectedParagraph = null;
  }
}
