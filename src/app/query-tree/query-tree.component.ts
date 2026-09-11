import { Component,EventEmitter,Output } from '@angular/core';

@Component({
  selector: 'app-query-tree',
  templateUrl: './query-tree.component.html',
  styleUrls: ['./query-tree.component.css']
})
export class QueryTreeComponent {
  @Output() nodeClicked = new EventEmitter<any>();
  topics = [
    {
      name: 'Object-Centric Queries',
      expanded: false,
      children: [
        { name: 'A red sports car' },
        { name: 'Golden retriever dog' },
        { name: 'A ripe banana on a white background' },
        { name: 'A commercial airplane taking off' },
        { name: 'Two children riding bicycles' }
      ]
    },
    {
      name: 'Scene and Environment Queries',
      expanded: false,
      children: [
        { name: 'A beach during sunset' },
        { name: 'Snow-covered mountain landscape' },
        { name: 'A crowded marketplace in Asia' },
        { name: 'A classroom with students and a blackboard' },
        { name: 'A modern office with glass windows' }
      ]
    },
    {
      name: 'Activity-Based Queries',
      expanded: false,
      children: [
        { name: 'People playing basketball outdoors' },
        { name: 'A chef cooking in a kitchen' },
        { name: 'Students studying in a library' },
        { name: 'Firefighters extinguishing a fire' },
        { name: 'Man running on a trail in the forest' }
      ]
    },
    {
      name: 'Emotion & Mood Queries',
      expanded: false,
      children: [
        { name: 'A happy child laughing' },
        { name: 'A lonely man in the rain' },
        { name: 'A peaceful countryside scene' },
        { name: 'A tense courtroom' },
        { name: 'Joyful wedding celebration' }
      ]
    },
    {
      name: 'Composition or Style Queries',
      expanded: false,
      children: [
        { name: 'Image with symmetrical composition' },
        { name: 'Minimalist black and white photo' },
        { name: 'A blurry photo taken at night' },
        { name: 'High-contrast street photography' },
        { name: 'Overhead shot of food on a wooden table' }
      ]
    },
    {
      name: 'Text-to-Image CLIP Testing Prompts',
      expanded: false,
      children: [
        { name: 'A photo of a cat wearing sunglasses' },
        { name: 'A cartoon image of a robot' },
        { name: 'A painting of a city skyline at night' },
        { name: 'A realistic image of a space shuttle launch' },
        { name: 'An infographic about climate change' }
      ]
    },
    {
      name: 'Abstract/Conceptual Prompts',
      expanded: false,
      children: [
        { name: 'Freedom and isolation' },
        { name: 'Innovation and technology' },
        { name: 'Nature reclaiming urban space' },
        { name: 'Chaos and order' },
        { name: 'Silence and stillness' }
      ]
    }
  ];
  toggleTopic(group: any): void {
    group.expanded = !group.expanded;
  }

  onQueryClick(query: any, event: Event): void {
    event.stopPropagation();
    this.nodeClicked.emit(query.name);
  }
}
