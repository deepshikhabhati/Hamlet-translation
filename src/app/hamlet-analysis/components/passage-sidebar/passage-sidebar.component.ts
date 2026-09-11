import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  HamletDataService,
  PassageFilters,
} from '../../services/hamlet-data.service';

@Component({
  selector: 'app-ha-passage-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './passage-sidebar.component.html',
  styleUrls: ['./passage-sidebar.component.scss'],
})
export class PassageSidebarComponent implements OnChanges {
  @Input() passages: any[] = [];
  @Input() selectedPassageId: string | null = null;
  @Input() filters: PassageFilters = { search: '', act: null, scene: null, feature: '' };

  @Output() passageSelect = new EventEmitter<any>();
  @Output() filtersChange = new EventEmitter<PassageFilters>();

  filteredPassages: any[] = [];
  acts: number[] = [];
  scenes: number[] = [];
  features: string[] = [];

  localFilters: PassageFilters = { search: '', act: null, scene: null, feature: '' };

  constructor(private dataService: HamletDataService) {}

  ngOnChanges(): void {
    this.localFilters = { ...this.filters };
    this.acts = this.dataService.getUniqueActs(this.passages);
    this.features = this.dataService.getUniqueFeatures(this.passages);
    this.updateScenes();
    this.applyFilters();
  }

  updateScenes(): void {
    this.scenes = this.dataService.getUniqueScenes(
      this.passages,
      this.localFilters.act
    );
    if (
      this.localFilters.scene != null &&
      !this.scenes.includes(this.localFilters.scene)
    ) {
      this.localFilters.scene = null;
    }
  }

  onFilterChange(): void {
    this.updateScenes();
    this.applyFilters();
    this.filtersChange.emit({ ...this.localFilters });
  }

  applyFilters(): void {
    let result = [...this.passages];
    const q = this.localFilters.search.trim().toLowerCase();

    if (q) {
      result = result.filter(
        (p) =>
          p.passage_id.toLowerCase().includes(q) ||
          p.speaker.toLowerCase().includes(q)
      );
    }
    if (this.localFilters.act != null) {
      result = result.filter((p) => p.act === this.localFilters.act);
    }
    if (this.localFilters.scene != null) {
      result = result.filter((p) => p.scene === this.localFilters.scene);
    }
    if (this.localFilters.feature) {
      result = result.filter(
        (p) => p.primary_research_feature === this.localFilters.feature
      );
    }
    this.filteredPassages = result;
  }

  selectPassage(passage: any): void {
    this.passageSelect.emit(passage);
  }
}
