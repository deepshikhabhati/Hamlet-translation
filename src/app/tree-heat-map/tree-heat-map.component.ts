import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-tree-heatmap',
  template: `<div #treemapContainer style="width: 100%; height: 600px;"></div>`,
  styleUrls: ['./tree-heat-map.component.css']
})
export class TreeHeatmapComponent implements OnInit,AfterViewInit {
  @ViewChild('treemapContainer', { static: true }) private containerRef!: ElementRef;


  private data = [
    {
      "topic_path": "Second AI winter/AI behind the scenes/AI behind the scenes/leaf3",
      "content": "Nick Bostrom explains: 'A lot of cutting edge AI has filtered into general applications, often without being called AI because once something becomes useful enough and common enough it's not labeled AI anymore.'",
      "similarity_score": 73.39794039726257,
      "rank": 10
    },
    {
      "topic_path": "Second AI winter/Intelligent agents/Intelligent agents/leaf_1",
      "content": "An intelligent agent is a system that perceives its environment and takes actions which maximize its chances of success. By this definition, simple programs that solve specific problems are 'intelligent agents', as are human beings and organizations of human beings, such as firms. The intelligent agent paradigm defines AI research as 'the study of intelligent agents'.[aj] This is a generalization of some earlier definitions of AI: it goes beyond studying human intelligence; it studies all kinds of intelligence.",
      "similarity_score": 67.83266067504883,
      "rank": 9
    },
    {
      "topic_path": "Second AI winter/Intelligent agents",
      "content": "A new paradigm called \"intelligent agents\" became widely accepted during the 1990s.[251][252][ah] Although earlier researchers had proposed modular \"divide and conquer\" approaches to AI,[ai] the intelligent agent did not reach its modern form until Judea Pearl, Allen Newell, Leslie P. Kaelbling, and others brought concepts from decision theory and economics into the study of AI.[253] When the economist's definition of a rational agent was married to computer science's definition of an object or module, the intelligent agent paradigm was complete. An intelligent agent is a system that perceives its environment and takes actions which maximize its chances of success. By this definition, simple programs that solve specific problems are \"intelligent agents\", as are human beings and organizations of human beings, such as firms. The intelligent agent paradigm defines AI research as \"the study of intelligent agents\".[aj] This is a generalization of some earlier definitions of AI: it goes beyond studying human intelligence; it studies all kinds of intelligence. The paradigm gave researchers license to study isolated problems and to disagree about methods, but still retain hope that their work could be combined into an agent architecture that would be capable of general intelligence.[254]",
      "similarity_score": 62.8031849861145,
      "rank": 8
    },
    {
      "topic_path": "Second AI winter/Intelligent agents/Intelligent agents",
      "content": "A new paradigm called \"intelligent agents\" became widely accepted during the 1990s.[251][252][ah] Although earlier researchers had proposed modular \"divide and conquer\" approaches to AI,[ai] the intelligent agent did not reach its modern form until Judea Pearl, Allen Newell, Leslie P. Kaelbling, and others brought concepts from decision theory and economics into the study of AI.[253] When the economist's definition of a rational agent was married to computer science's definition of an object or module, the intelligent agent paradigm was complete. An intelligent agent is a system that perceives its environment and takes actions which maximize its chances of success. By this definition, simple programs that solve specific problems are \"intelligent agents\", as are human beings and organizations of human beings, such as firms. The intelligent agent paradigm defines AI research as \"the study of intelligent agents\".[aj] This is a generalization of some earlier definitions of AI: it goes beyond studying human intelligence; it studies all kinds of intelligence. The paradigm gave researchers license to study isolated problems and to disagree about methods, but still retain hope that their work could be combined into an agent architecture that would be capable of general intelligence.[254]",
      "similarity_score": 62.8031849861145,
      "rank": 7
    },
    {
      "topic_path": "Birth of artificial intelligence (1941-56)/Dartmouth Workshop",
      "content": "The Dartmouth workshop of 1956 was a pivotal event that marked the formal inception of AI as an academic discipline.[61] It was organized by Marvin Minsky and John McCarthy, with the support of two senior scientists Claude Shannon and Nathan Rochester of IBM. The proposal for the conference stated they intended to test the assertion that \"every aspect of learning or any other feature of intelligence can be so precisely described that a machine can be made to simulate it\".[80][d] The term \"Artificial Intelligence\" was introduced by John McCarthy at the workshop.[e] \nThe participants included Ray Solomonoff, Oliver Selfridge, Trenchard More, Arthur Samuel, Allen Newell and Herbert A. Simon, all of whom would create important programs during the first decades of AI research.[86][f] At the workshop Newell and Simon debuted the \"Logic Theorist\".[87] The workshop was the moment that AI gained its name, its mission, its first major success and its key players, and is widely considered the birth of AI.[g]",
      "similarity_score": 62.58636116981506,
      "rank": 6
    },
    {
      "topic_path": "Birth of artificial intelligence (1941-56)/Dartmouth Workshop/Dartmouth Workshop",
      "content": "The Dartmouth workshop of 1956 was a pivotal event that marked the formal inception of AI as an academic discipline.[61] It was organized by Marvin Minsky and John McCarthy, with the support of two senior scientists Claude Shannon and Nathan Rochester of IBM. The proposal for the conference stated they intended to test the assertion that \"every aspect of learning or any other feature of intelligence can be so precisely described that a machine can be made to simulate it\".[80][d] The term \"Artificial Intelligence\" was introduced by John McCarthy at the workshop.[e] \nThe participants included Ray Solomonoff, Oliver Selfridge, Trenchard More, Arthur Samuel, Allen Newell and Herbert A. Simon, all of whom would create important programs during the first decades of AI research.[86][f] At the workshop Newell and Simon debuted the \"Logic Theorist\".[87] The workshop was the moment that AI gained its name, its mission, its first major success and its key players, and is widely considered the birth of AI.[g]",
      "similarity_score": 62.58636116981506,
      "rank": 5
    },
    {
      "topic_path": "Birth of artificial intelligence (1941-56)/Dartmouth Workshop/Dartmouth Workshop/leaf_1",
      "content": "The Dartmouth workshop of 1956 was a pivotal event that marked the formal inception of AI as an academic discipline.[61] It was organized by Marvin Minsky and John McCarthy, with the support of two senior scientists Claude Shannon and Nathan Rochester of IBM. The proposal for the conference stated they intended to test the assertion that 'every aspect of learning or any other feature of intelligence can be so precisely described that a machine can be made to simulate it'.[80][d] The term 'Artificial Intelligence' was introduced by John McCarthy at the workshop.[e] The participants included Ray Solomonoff, Oliver Selfridge, Trenchard More, Arthur Samuel, Allen Newell and Herbert A. Simon, all of whom would create important programs during the first decades of AI research.[86][f] At the workshop Newell and Simon debuted the 'Logic Theorist'.[87] The workshop was the moment that AI gained its name, its mission, its first major success and its key players, and is widely considered the birth of AI",
      "similarity_score": 62.47149705886841,
      "rank": 4
    },
    {
      "topic_path": "Second AI winter/AI behind the scenes",
      "content": "In the 1990s, algorithms originally developed by AI researchers began to appear as parts of larger systems. AI had solved a lot of very difficult problems[ag] and their solutions proved to be useful throughout the technology industry,[239][240] such as data mining, industrial robotics, logistics, speech recognition,[241] banking software,[242] medical diagnosis[242] and Google's search engine.[243][244] The field of AI received little or no credit for these successes in the 1990s and early 2000s. Many of AI's greatest innovations have been reduced to the status of just another item in the tool chest of computer science.[245] Nick Bostrom explains: \"A lot of cutting edge AI has filtered into general applications, often without being called AI because once something becomes useful enough and common enough it's not labeled AI anymore.\"[242] Many researchers in AI in the 1990s deliberately called their work by other names, such as informatics, knowledge-based systems, \"cognitive systems\" or computational intelligence. In part, this may have been because they considered their field to be fundamentally different from AI, but also the new names help to procure funding.[241][246][247] In the commercial world at least, the failed promises of the AI Winter continued to haunt AI research into the 2000s, as the New York Times reported in 2005: \"Computer scientists and software engineers avoided the term artificial intelligence for fear of being viewed as wild-eyed dreamers.\"[248]",
      "similarity_score": 61.682552099227905,
      "rank": 3
    },
    {
      "topic_path": "Second AI winter/AI behind the scenes/AI behind the scenes",
      "content": "In the 1990s, algorithms originally developed by AI researchers began to appear as parts of larger systems. AI had solved a lot of very difficult problems[ag] and their solutions proved to be useful throughout the technology industry,[239][240] such as data mining, industrial robotics, logistics, speech recognition,[241] banking software,[242] medical diagnosis[242] and Google's search engine.[243][244] The field of AI received little or no credit for these successes in the 1990s and early 2000s. Many of AI's greatest innovations have been reduced to the status of just another item in the tool chest of computer science.[245] Nick Bostrom explains: \"A lot of cutting edge AI has filtered into general applications, often without being called AI because once something becomes useful enough and common enough it's not labeled AI anymore.\"[242] Many researchers in AI in the 1990s deliberately called their work by other names, such as informatics, knowledge-based systems, \"cognitive systems\" or computational intelligence. In part, this may have been because they considered their field to be fundamentally different from AI, but also the new names help to procure funding.[241][246][247] In the commercial world at least, the failed promises of the AI Winter continued to haunt AI research into the 2000s, as the New York Times reported in 2005: \"Computer scientists and software engineers avoided the term artificial intelligence for fear of being viewed as wild-eyed dreamers.\"[248]",
      "similarity_score": 61.682552099227905,
      "rank": 2
    },
    {
      "topic_path": "Second AI winter/Mathematical rigor, greater collaboration and a narrow focus/Mathematical rigor, greater collaboration and a narrow focus/leaf_2",
      "content": "There was a widespread realization that many of the problems that AI needed to solve were already being worked on by researchers in fields like statistics, mathematics, electrical engineering, economics or operations research. The shared mathematical language allowed both a higher level of collaboration with more established and successful fields and the achievement of results which were measurable and provable; AI had become a more rigorous scientific discipline.",
      "similarity_score": 61.46898865699768,
      "rank": 1
    },
    {
      "topic_path": "Second AI winter/Intelligent agents/Intelligent agents/leaf_2",
      "content": "There was a widespread realization that many of the problems that AI needed to solve were already being worked on by researchers in fields like statistics, mathematics, electrical engineering, economics or operations research. The shared mathematical language allowed both a higher level of collaboration with more established and successful fields and the achievement of results which were measurable and provable; AI had become a more rigorous scientific discipline.",
      "similarity_score": 61.46898865699768,
      "rank": 0
    },
    {
      "topic_path": "Second AI winter/AI behind the scenes/AI behind the scenes/leaf1",
      "content": "In the 1990s, algorithms originally developed by AI researchers began to appear as parts of larger systems. AI had solved a lot of very difficult problems and their solutions proved to be useful throughout the technology industry, such as data mining, industrial robotics, logistics, speech recognition, banking software, medical diagnosis and Google's search engine.",
      "similarity_score": 60.05772948265076,
      "rank": -1
    },
    {
      "topic_path": "Second AI winter/Mathematical rigor, greater collaboration and a narrow focus",
      "content": "AI researchers began to develop and use sophisticated mathematical tools more than they ever had in the past.[249][250] Most of the new directions in AI relied heavily on mathematical models, including artificial neural networks, probabilistic reasoning, soft computing and reinforcement learning. In the 90s and 2000s, many other highly mathematical tools were adapted for AI. These tools were applied to machine learning, perception and mobility. There was a widespread realization that many of the problems that AI needed to solve were already being worked on by researchers in fields like statistics, mathematics, electrical engineering, economics or operations research. The shared mathematical language allowed both a higher level of collaboration with more established and successful fields and the achievement of results which were measurable and provable; AI had become a more rigorous \"scientific\" discipline. Another key reason for the success in the 90s was that AI researchers focussed on specific problems with verifiable solutions (an approach later derided as narrow AI). This provided useful tools in the present, rather than speculation about the future.",
      "similarity_score": 56.67887330055237,
      "rank": -2
    },
    {
      "topic_path": "Second AI winter/Mathematical rigor, greater collaboration and a narrow focus/Mathematical rigor, greater collaboration and a narrow focus",
      "content": "AI researchers began to develop and use sophisticated mathematical tools more than they ever had in the past.[249][250] Most of the new directions in AI relied heavily on mathematical models, including artificial neural networks, probabilistic reasoning, soft computing and reinforcement learning. In the 90s and 2000s, many other highly mathematical tools were adapted for AI. These tools were applied to machine learning, perception and mobility. There was a widespread realization that many of the problems that AI needed to solve were already being worked on by researchers in fields like statistics, mathematics, electrical engineering, economics or operations research. The shared mathematical language allowed both a higher level of collaboration with more established and successful fields and the achievement of results which were measurable and provable; AI had become a more rigorous \"scientific\" discipline. Another key reason for the success in the 90s was that AI researchers focussed on specific problems with verifiable solutions (an approach later derided as narrow AI). This provided useful tools in the present, rather than speculation about the future.",
      "similarity_score": 56.67887330055237,
      "rank": -3
    },
    {
      "topic_path": "Second AI winter/Mathematical rigor, greater collaboration and a narrow focus/Mathematical rigor, greater collaboration and a narrow focus/leaf_1",
      "content": "AI researchers began to develop and use sophisticated mathematical tools more than they ever had in the past.[249][250] Most of the new directions in AI relied heavily on mathematical models, including artificial neural networks, probabilistic reasoning, soft computing and reinforcement learning. In the 90s and 2000s, many other highly mathematical tools were adapted for AI. These tools were applied to machine learning, perception and mobility.",
      "similarity_score": 55.33114671707153,
      "rank": -4
    }
  ]

  ngOnInit(): void {
    // setTimeout(() => {
    // const hierarchyData = this.buildHierarchy(this.data);
    // this.drawTreemap(hierarchyData);
    // },2000)
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.data.length > 0) {
        this.renderTreemap();
      }
    }, 2000);
  }

  private renderTreemap(): void {
    const element = this.containerRef.nativeElement;
  

    const root = this.buildHierarchy(this.data);
    const hierarchy = d3.hierarchy(root).sum(d => d['children'] ? 0 : 1).sort((a, b) => b.value! - a.value!);

    const width = this.containerRef.nativeElement.clientWidth || 600;
    const height = this.containerRef.nativeElement.clientHeight || 600;
    
    const treemapLayout = d3.treemap()
      .size([width, height]) // Must be valid
      .paddingInner(1);
    treemapLayout(hierarchy);

    // console.log("treemap nodes:", root.leaves().map((d: any) => ({
    //   name: d.data.name,
    //   x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1
    // })));

    d3.select(element).selectAll('*').remove();

    const svg = d3.select(element)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const nodes = svg.selectAll('g')
      .data(hierarchy.descendants())
      .enter()
      .append('g')
      .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`);

    nodes.append('rect')
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('fill', d => d.children ? '#69b3a2' : '#fdd835')
      .attr('stroke', '#fff');

    nodes.append('text')
      .attr('x', 4)
      .attr('y', 14)
      .text(d => d.data.name)
      .style('font-size', '12px')
      .style('fill', '#000')
      .style('pointer-events', 'none');
  }

  private buildHierarchy(data: { topic_path: string }[]): any {
    const root: any = { name: 'root', children: [] };

    data.forEach(item => {
      const parts = item.topic_path.split('/');
      let current = root;

      parts.forEach(part => {
        let found = current.children.find((d: any) => d.name === part);
        if (!found) {
          found = { name: part, children: [] };
          current.children.push(found);
        }
        current = found;
      });
    });

    return root;
  }
}
