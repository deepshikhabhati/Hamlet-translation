// app-treemap.component.ts
import {
  Component,
  OnInit,
  OnChanges,
  Input,
  ElementRef,
  ViewChild,
  SimpleChanges
} from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-treemap',
  templateUrl: './treemap.component.html',
  styleUrls: ['./treemap.component.css']
})
export class TreeMapComponent implements OnInit, OnChanges {
  @Input() data: any;
  @ViewChild('treemapContainer', { static: true }) container: any;

  data1 = {
    "name": "Root",
    "children": [
        {
            "name": "Precursors",
            "children": [
                {
                    "name": "Mythical, fictional, and speculative precursors",
                    "children": [
                        {
                            "name": "Myth and legend",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                }
                            ]
                        },
                        {
                            "name": "Medieval legends of artificial beings",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                },
                                {
                                    "name": "leaf_3"
                                },
                                {
                                    "name": "leaf_4"
                                }
                            ]
                        },
                        {
                            "name": "Modern fiction",
                            "children": [
                                {
                                    "name": "leaf_1"
                                }
                            ]
                        },
                        {
                            "name": "Automata",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                },
                                {
                                    "name": "leaf_3"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Formal reasoning",
                    "children": [
                        {
                            "name": "Formal reasoning",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                },
                                {
                                    "name": "leaf_3"
                                },
                                {
                                    "name": "leaf_4"
                                },
                                {
                                    "name": "leaf_5"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Computer science",
                    "children": [
                        {
                            "name": "Computer science",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            "name": "Birth",
            "children": [
                {
                    "name": "Turing Test",
                    "children": [
                        {
                            "name": "Turing Test",
                            "children": [
                                {
                                    "name": "leaf_1"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Neuroscience and Hebbian theory",
                    "children": [
                        {
                            "name": "Neuroscience and Hebbian theory",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Artificial neural networks",
                    "children": [
                        {
                            "name": "Artificial neural networks",
                            "children": [
                                {
                                    "name": "leaf_1"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Cybernetic robots",
                    "children": [
                        {
                            "name": "Cybernetic robots",
                            "children": [
                                {
                                    "name": "leaf_1"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Game AI",
                    "children": [
                        {
                            "name": "Game AI",
                            "children": [
                                {
                                    "name": "leaf_1"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Symbolic reasoning and the Logic Theorist",
                    "children": [
                        {
                            "name": "Symbolic reasoning and the Logic Theorist",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Dartmouth Workshop",
                    "children": [
                        {
                            "name": "Dartmouth Workshop",
                            "children": [
                                {
                                    "name": "leaf_1"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Cognitive revolution",
                    "children": [
                        {
                            "name": "Cognitive revolution",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                },
                                {
                                    "name": "leaf_3"
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            "name": "Early successes",
            "children": [
                {
                    "name": "Approaches",
                    "children": [
                        {
                            "name": "Reasoning, planning and problem solving as search",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                }
                            ]
                        },
                        {
                            "name": "Natural language",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                },
                                {
                                    "name": "leaf_3"
                                }
                            ]
                        },
                        {
                            "name": "Micro-worlds",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                }
                            ]
                        },
                        {
                            "name": "Perceptrons and early neural networks",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                },
                                {
                                    "name": "leaf_3"
                                },
                                {
                                    "name": "leaf_4"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Optimism",
                    "children": [
                        {
                            "name": "Optimism",
                            "children": [
                                {
                                    "name": "leaf_1"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Financing",
                    "children": [
                        {
                            "name": "Financing",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            "name": "First AI Winter",
            "children": [
                {
                    "name": "Problems",
                    "children": [
                        {
                            "name": "Problems",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                },
                                {
                                    "name": "leaf_3"
                                },
                                {
                                    "name": "leaf_4"
                                },
                                {
                                    "name": "leaf_5"
                                },
                                {
                                    "name": "leaf_6"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Decrease in funding",
                    "children": [
                        {
                            "name": "Decrease in funding",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                },
                                {
                                    "name": "leaf_3"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Philosophical and ethical critiques",
                    "children": [
                        {
                            "name": "Philosophical and ethical critiques",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Logic at Stanford, CMU and Edinburgh",
                    "children": [
                        {
                            "name": "Logic at Stanford, CMU and Edinburgh",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            "name": "Second AI winter",
            "children": [
                {
                    "name": "AI winter",
                    "children": [
                        {
                            "name": "AI winter",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                },
                                {
                                    "name": "leaf_3"
                                },
                                {
                                    "name": "leaf_4"
                                },
                                {
                                    "name": "leaf_5"
                                },
                                {
                                    "name": "leaf_6"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "AI behind the scenes",
                    "children": [
                        {
                            "name": "AI behind the scenes",
                            "children": [
                                {
                                    "name": "leaf1"
                                },
                                {
                                    "name": "leaf2"
                                },
                                {
                                    "name": "leaf3"
                                },
                                {
                                    "name": "leaf4"
                                },
                                {
                                    "name": "leaf5"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Mathematical rigor, greater collaboration and a narrow focus",
                    "children": [
                        {
                            "name": "Mathematical rigor, greater collaboration and a narrow focus",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Intelligent agents",
                    "children": [
                        {
                            "name": "Intelligent agents",
                            "children": [
                                {
                                    "name": "leaf_1"
                                },
                                {
                                    "name": "leaf_2"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}

data2: any = {
  name: 'Root',
  children: [
    {
      name: 'children1',
      children: [
        { name: 'subchildren1' ,
          children: [
            { name: 'subchildren4' }
          ]
        },
        { name: 'subchildren2' }
      ]
    },
    {
      name: 'Children2',
      children: [
        { name: 'subchildren3' }
      ]
    }
  ]
};
  
  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    if (this.data1) {
      this.renderTreemap();
    }
  }

  ngOnChanges(changes: any): void {
    if (changes['data'] && this.data1) {
      this.renderTreemap();
    }
  }


  renderTreemap(): void {
    const container = this.container.nativeElement;
    container.innerHTML = '';
  
    const width = 500;
    const height = 500;
  
    const svg = d3.select(container).append('svg')
      .attr('width', width)
      .attr('height', height);
  
    const root: any = d3.hierarchy(this.data2)
      .sum(() => 1)
      .sort((a, b) => b.value! - a.value!);
  
    d3.treemap()
      .size([width, height])
      .padding(2)
      .round(true)
      .tile(d3.treemapResquarify)(root);
  
    const nodes = svg.selectAll('g')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`);
  
    const color = d3.scaleOrdinal(d3.schemeCategory10);
  
    nodes.append('rect')
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('fill', (d: any) => {
        if (d.depth === 0) return '#888';
        if (d.depth === 1) return '#aaa';
        return color(d.parent?.data.name);
      })
      .attr('stroke', '#fff');
  
    nodes.append('text')
      .attr('x', 4)
      .attr('y', 14)
      .attr('fill', 'black')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .text((d: any) => {
        const name = d.data.name;
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        // Show text only if there's enough space
        return width > 40 && height > 15 ? name : '';
      });
  }
  
}
