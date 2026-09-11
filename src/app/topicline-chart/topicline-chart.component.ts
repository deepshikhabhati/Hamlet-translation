import { Component,Output, EventEmitter,Input, OnInit, OnChanges } from '@angular/core';
import { Chart, LineElement, LineController, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

@Component({
  selector: 'app-topic-line-chart',
  templateUrl: './topicline-chart.component.html',
  styleUrls: ['./topicline-chart.component.css']
})
export class TopicLineChartComponent implements OnChanges {
  @Input() rankedTopics: any[] = [];
  @Input() rankedTopics2: any[] = [];
  @Output() pointClicked = new EventEmitter<string>();

  chart: any;
  pathIndex: any ={
    "Precursors": 1,
    "Precursors/Mythical, fictional, and speculative precursors": 2,
    "Precursors/Mythical, fictional, and speculative precursors/Myth and legend": 3,
    "Precursors/Mythical, fictional, and speculative precursors/Myth and legend/leaf_1": 4,
    "Precursors/Mythical, fictional, and speculative precursors/Myth and legend/leaf_2": 5,
    "Precursors/Mythical, fictional, and speculative precursors/Medieval legends of artificial beings": 6,
    "Precursors/Mythical, fictional, and speculative precursors/Medieval legends of artificial beings/leaf_1": 7,
    "Precursors/Mythical, fictional, and speculative precursors/Medieval legends of artificial beings/leaf_2": 8,
    "Precursors/Mythical, fictional, and speculative precursors/Medieval legends of artificial beings/leaf_3": 9,
    "Precursors/Mythical, fictional, and speculative precursors/Medieval legends of artificial beings/leaf_4": 10,
    "Precursors/Mythical, fictional, and speculative precursors/Modern fiction": 11,
    "Precursors/Mythical, fictional, and speculative precursors/Modern fiction/leaf_1": 12,
    "Precursors/Mythical, fictional, and speculative precursors/Automata": 13,
    "Precursors/Mythical, fictional, and speculative precursors/Automata/leaf_1": 14,
    "Precursors/Mythical, fictional, and speculative precursors/Automata/leaf_2": 15,
    "Precursors/Mythical, fictional, and speculative precursors/Automata/leaf_3": 16,
    "Precursors/Formal reasoning": 17,
    "Precursors/Formal reasoning/Formal reasoning": 18,
    "Precursors/Formal reasoning/Formal reasoning/leaf_1": 19,
    "Precursors/Formal reasoning/Formal reasoning/leaf_2": 20,
    "Precursors/Formal reasoning/Formal reasoning/leaf_3": 21,
    "Precursors/Formal reasoning/Formal reasoning/leaf_4": 22,
    "Precursors/Formal reasoning/Formal reasoning/leaf_5": 23,
    "Precursors/Computer science": 24,
    "Precursors/Computer science/Computer science": 25,
    "Precursors/Computer science/Computer science/leaf_1": 26,
    "Precursors/Computer science/Computer science/leaf_2": 27,
    "Birth": 28,
    "Birth/Turing Test": 29,
    "Birth/Turing Test/Turing Test": 30,
    "Birth/Turing Test/Turing Test/leaf_1": 31,
    "Birth/Neuroscience and Hebbian theory": 32,
    "Birth/Neuroscience and Hebbian theory/Neuroscience and Hebbian theory": 33,
    "Birth/Neuroscience and Hebbian theory/Neuroscience and Hebbian theory/leaf_1": 34,
    "Birth/Neuroscience and Hebbian theory/Neuroscience and Hebbian theory/leaf_2": 35,
    "Birth/Artificial neural networks": 36,
    "Birth/Artificial neural networks/Artificial neural networks": 37,
    "Birth/Artificial neural networks/Artificial neural networks/leaf_1": 38,
    "Birth/Cybernetic robots": 39,
    "Birth/Cybernetic robots/Cybernetic robots": 40,
    "Birth/Cybernetic robots/Cybernetic robots/leaf_1": 41,
    "Birth/Game AI": 42,
    "Birth/Game AI/Game AI": 43,
    "Birth/Game AI/Game AI/leaf_1": 44,
    "Birth/Symbolic reasoning and the Logic Theorist": 45,
    "Birth/Symbolic reasoning and the Logic Theorist/Symbolic reasoning and the Logic Theorist": 46,
    "Birth/Symbolic reasoning and the Logic Theorist/Symbolic reasoning and the Logic Theorist/leaf_1": 47,
    "Birth/Symbolic reasoning and the Logic Theorist/Symbolic reasoning and the Logic Theorist/leaf_2": 48,
    "Birth/Dartmouth Workshop": 49,
    "Birth/Dartmouth Workshop/Dartmouth Workshop": 50,
    "Birth/Dartmouth Workshop/Dartmouth Workshop/leaf_1": 51,
    "Birth/Cognitive revolution": 52,
    "Birth/Cognitive revolution/Cognitive revolution": 53,
    "Birth/Cognitive revolution/Cognitive revolution/leaf_1": 54,
    "Birth/Cognitive revolution/Cognitive revolution/leaf_2": 55,
    "Birth/Cognitive revolution/Cognitive revolution/leaf_3": 56,
    "Early successes": 57,
    "Early successes/Approaches": 58,
    "Early successes/Approaches/Reasoning, planning and problem solving as search": 59,
    "Early successes/Approaches/Reasoning, planning and problem solving as search/leaf_1": 60,
    "Early successes/Approaches/Reasoning, planning and problem solving as search/leaf_2": 61,
    "Early successes/Approaches/Natural language": 62,
    "Early successes/Approaches/Natural language/leaf_1": 63,
    "Early successes/Approaches/Natural language/leaf_2": 64,
    "Early successes/Approaches/Natural language/leaf_3": 65,
    "Early successes/Approaches/Micro-worlds": 66,
    "Early successes/Approaches/Micro-worlds/leaf_1": 67,
    "Early successes/Approaches/Micro-worlds/leaf_2": 68,
    "Early successes/Approaches/Perceptrons and early neural networks": 69,
    "Early successes/Approaches/Perceptrons and early neural networks/leaf_1": 70,
    "Early successes/Approaches/Perceptrons and early neural networks/leaf_2": 71,
    "Early successes/Approaches/Perceptrons and early neural networks/leaf_3": 72,
    "Early successes/Approaches/Perceptrons and early neural networks/leaf_4": 73,
    "Early successes/Optimism": 74,
    "Early successes/Optimism/Optimism": 75,
    "Early successes/Optimism/Optimism/leaf_1": 76,
    "Early successes/Financing": 77,
    "Early successes/Financing/Financing": 78,
    "Early successes/Financing/Financing/leaf_1": 79,
    "Early successes/Financing/Financing/leaf_2": 80,
    "First AI Winter": 81,
    "First AI Winter/Problems": 82,
    "First AI Winter/Problems/Problems": 83,
    "First AI Winter/Problems/Problems/leaf_1": 84,
    "First AI Winter/Problems/Problems/leaf_2": 85,
    "First AI Winter/Problems/Problems/leaf_3": 86,
    "First AI Winter/Problems/Problems/leaf_4": 87,
    "First AI Winter/Problems/Problems/leaf_5": 88,
    "First AI Winter/Problems/Problems/leaf_6": 89,
    "First AI Winter/Decrease in funding": 90,
    "First AI Winter/Decrease in funding/Decrease in funding": 91,
    "First AI Winter/Decrease in funding/Decrease in funding/leaf_1": 92,
    "First AI Winter/Decrease in funding/Decrease in funding/leaf_2": 93,
    "First AI Winter/Decrease in funding/Decrease in funding/leaf_3": 94,
    "First AI Winter/Philosophical and ethical critiques": 95,
    "First AI Winter/Philosophical and ethical critiques/Philosophical and ethical critiques": 96,
    "First AI Winter/Philosophical and ethical critiques/Philosophical and ethical critiques/leaf_1": 97,
    "First AI Winter/Philosophical and ethical critiques/Philosophical and ethical critiques/leaf_2": 98,
    "First AI Winter/Logic at Stanford, CMU and Edinburgh": 99,
    "First AI Winter/Logic at Stanford, CMU and Edinburgh/Logic at Stanford, CMU and Edinburgh": 100,
    "First AI Winter/Logic at Stanford, CMU and Edinburgh/Logic at Stanford, CMU and Edinburgh/leaf_1": 101,
    "First AI Winter/Logic at Stanford, CMU and Edinburgh/Logic at Stanford, CMU and Edinburgh/leaf_2": 102,
    "Second AI winter": 103,
    "Second AI winter/AI winter": 104,
    "Second AI winter/AI winter/AI winter": 105,
    "Second AI winter/AI winter/AI winter/leaf_1": 106,
    "Second AI winter/AI winter/AI winter/leaf_2": 107,
    "Second AI winter/AI winter/AI winter/leaf_3": 108,
    "Second AI winter/AI winter/AI winter/leaf_4": 109,
    "Second AI winter/AI winter/AI winter/leaf_5": 110,
    "Second AI winter/AI winter/AI winter/leaf_6": 111,
    "Second AI winter/AI behind the scenes": 112,
    "Second AI winter/AI behind the scenes/AI behind the scenes": 113,
    "Second AI winter/AI behind the scenes/AI behind the scenes/leaf1": 114,
    "Second AI winter/AI behind the scenes/AI behind the scenes/leaf2": 115,
    "Second AI winter/AI behind the scenes/AI behind the scenes/leaf3": 116,
    "Second AI winter/AI behind the scenes/AI behind the scenes/leaf4": 117,
    "Second AI winter/AI behind the scenes/AI behind the scenes/leaf5": 118,
    "Second AI winter/Mathematical rigor, greater collaboration and a narrow focus": 119,
    "Second AI winter/Mathematical rigor, greater collaboration and a narrow focus/Mathematical rigor, greater collaboration and a narrow focus": 120,
    "Second AI winter/Mathematical rigor, greater collaboration and a narrow focus/Mathematical rigor, greater collaboration and a narrow focus/leaf_1": 121,
    "Second AI winter/Mathematical rigor, greater collaboration and a narrow focus/Mathematical rigor, greater collaboration and a narrow focus/leaf_2": 122,
    "Second AI winter/Intelligent agents": 123,
    "Second AI winter/Intelligent agents/Intelligent agents": 124,
    "Second AI winter/Intelligent agents/Intelligent agents/leaf_1": 125,
    "Second AI winter/Intelligent agents/Intelligent agents/leaf_2": 126
}
  ngOnChanges() {

    if (this.chart) {
      this.chart.destroy();
    }

    let combined: any[] = [];

    this.rankedTopics.forEach(topic => {
      const matchedPath = this.getBestMatch(topic.topic_path);
      if (matchedPath) {
        combined.push({
          originalX: this.pathIndex[matchedPath],
          y: topic.similarity_score,
          path: matchedPath,
          query: 1,
          content: topic.content || topic.value
        });
      }
    });
    
    this.rankedTopics2.forEach(topic => {
      const matchedPath = this.getBestMatch(topic.topic_path);
      if (matchedPath) {
        combined.push({
          originalX: this.pathIndex[matchedPath],
          y: topic.similarity_score,
          path: matchedPath,
          query: 2,
          content: topic.content || topic.value
        });
      }
    });
    
    // Sort by originalX
    combined.sort((a: any, b: any) => a.originalX - b.originalX);
    
    // Assign rank (1-based index)
    combined.forEach((item: any, index: any) => {
      item.rank = index + 1;
    });
    
    // Separate again into dataPoints1 and dataPoints2 with rank as x-axis
    let dataPoints1 = combined.filter(d => d.query === 1).map(d => ({
      x: d.rank,
      y: d.y,
      path: d.path,
      content: d.content
    }));
    
    let dataPoints2 = combined.filter(d => d.query === 2).map(d => ({
      x: d.rank,
      y: d.y,
      path: d.path,
      content: d.content
    }));

    dataPoints2 = dataPoints2.sort((a: any, b: any) => a.x - b.x);

    console.log('Data Points:', dataPoints2);

    const ctx = document.getElementById('lineChart') as HTMLCanvasElement;
     this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Similarity Score',
            data: dataPoints1,
            parsing: {
              xAxisKey: 'x',
              yAxisKey: 'y'
            },
            borderColor: 'blue',
            backgroundColor: 'blue',
            fill: false,
            tension: 0.3,
            pointBackgroundColor: 'blue'
          },
          ...(dataPoints2.length > 0
            ? [{
                label: 'Similarity Score 2',
                data: dataPoints2,
                parsing: {
                  xAxisKey: 'x',
                  yAxisKey: 'y'
                },
                borderColor: 'green',
                backgroundColor: 'green',
                fill: false,
                tension: 0.3,
                pointBackgroundColor: 'green'
              }]
            : [])
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Path Index'
            },
            type: 'linear',
            ticks: {
              stepSize: 1
            }
          },
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Similarity Score'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function (context) {
                const point: any = context.raw;
                return `Path: ${point.path}, Score: ${point.y}`;
              }
            }
          }
        },
        onClick: (evt, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const datasetIndex = elements[0].datasetIndex;
            const point: any = datasetIndex === 0 ? dataPoints1[index] : dataPoints2[index];
            this.pointClicked.emit(point);
          }
        }
      }
    });
  }

  getBestMatch(inputPath: string): string | null {
    let bestMatch = null;
    let longestMatchLength = 0;
    for (const key in this.pathIndex) {
      if (inputPath.startsWith(key) && key.length > longestMatchLength) {
        bestMatch = key;
        longestMatchLength = key.length;
      }
    }
    return bestMatch;
  }
}
