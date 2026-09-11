import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
// import { PdfViewerModule } from 'ng2-pdf-viewer';
// import { HighchartsChartModule } from 'highcharts-angular';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { FormsModule } from '@angular/forms';
import { HeatmapComponent } from './heatmap/heatmap.component';
import { Chat1Component } from './chat1/chat1.component';
import { HighchartsChartModule } from 'highcharts-angular';
import { CircularTreeComponent } from './chat2/chat2.component';
import { ScatterPlotComponent } from './scatter-plot/scatter-plot.component';
import { PdfViewerComponent } from './pdf-viewer/pdf-viewer.component';
import { TableComponent } from './table/table.component';
import { TreeChartComponent } from './tree-chart/tree-chart.component';
// import { PlotlyModule } from 'angular-plotly.js';
// import * as PlotlyJS from 'plotly.js-dist'; // Use 'plotly.js-dist' instead of 'plotly.js-dist-min'
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';
import { VerticalHeatmapComponent } from './vertical-heatmap/vertical-heatmap.component';
import { ButtonHeaderComponent } from './button-header/button-header.component';
import { Comp1Component } from './comp1/comp1.component';
import { Comp3Component } from './comp3/comp3.component';
import { Comp2Component } from './comp2/comp2.component';
import { CircleTreeComponent } from './circle-tree/circle-tree.component';
import { SunburstComponent } from './sunburst/sunburst.component';
import { TopiclistComponent } from './topiclist/topiclist.component';
import { MainContentComponent } from './main-content/main-content.component';
import { MainContentFullComponent } from './main-content-full/main-content-full.component';
import { DonutChartComponent } from './donut-chart/donut-chart.component';
import { BarIntersectionComponent } from './bar-intersection/bar-intersection.component';
import { CommonBarComponent } from './common-bar/common-bar.component';
import { UmapPlotComponent } from './umap-plot/umap-plot.component';
import { Comp4Component } from './comp4/comp4.component';
import { CirclePackingComponent } from './circle-packing/circle-packing.component';
import { Comp5Component } from './comp5/comp5.component';
import { Comp6Component } from './comp6/comp6.component';
import { HistogramComponent } from './histogram/histogram.component';
import { MultiplePlotComponent } from './multiple-plot/multiple-plot.component';
import { QueryTreeComponent } from './query-tree/query-tree.component';
import { ClipAnalysisComponent } from './clip-analysis/clip-analysis.component';
import { TopicBarChartComponent } from './topic-bar-chart/topic-bar-chart.component';
import { TopicLineChartComponent } from './topicline-chart/topicline-chart.component';
import { TreeMapComponent } from './treemap/treemap.component';
import { TreeHeatmapComponent } from './tree-heat-map/tree-heat-map.component';
import { TopicDonutComponent } from './topic-donut/topic-donut.component';
import { PdfPopupComponent } from './pdf-popup/pdf-popup.component';
import { PdfHighlighterComponent } from './pdf-highlighter/pdf-highlighter.component';
import { VersionComparisonComponent } from './version-comparison/version-comparison.component';
import { DualViewContentComponent } from './dual-view-content/dual-view-content.component';
import { HamletContentComponent } from './hamlet-content/hamlet-content.component';
import { HamletTripleViewComponent } from './hamlet-triple-view/hamlet-triple-view.component';
import { MindMapComponent } from './mind-map/mind-map.component';
import { GermanStructureViewComponent } from './german-structure-view/german-structure-view.component';
import { HamletAnalysisComponent } from './hamlet-analysis';

// PlotlyModule.plotlyjs = PlotlyJS;

@NgModule({
  declarations: [
    AppComponent,
    HeatmapComponent,
    Chat1Component,
    CircularTreeComponent,
    ScatterPlotComponent,
    PdfViewerComponent,
    TableComponent,
    TreeChartComponent,
    SidebarComponent,
    HeaderComponent,
    VerticalHeatmapComponent,
    ButtonHeaderComponent,
    Comp1Component,
    Comp3Component,
    Comp2Component,
    CircleTreeComponent,
    SunburstComponent,
    TopiclistComponent,
    MainContentComponent,
    MainContentFullComponent,
    DonutChartComponent,
    BarIntersectionComponent,
    CommonBarComponent,
    UmapPlotComponent,
    Comp4Component,
    CirclePackingComponent,
    Comp5Component,
    Comp6Component,
    HistogramComponent,
    MultiplePlotComponent,
    QueryTreeComponent,
    ClipAnalysisComponent,
    TopicBarChartComponent,
    TopicLineChartComponent,
    TreeMapComponent,
    TreeHeatmapComponent,
    TopicDonutComponent,
    PdfPopupComponent,
    VersionComparisonComponent,
    DualViewContentComponent,
    HamletContentComponent,
    HamletTripleViewComponent,
    MindMapComponent,
    GermanStructureViewComponent
  ],
  imports: [
    NgCircleProgressModule.forRoot({
      // set defaults here
      radius: 100,
      outerStrokeWidth: 16,
      innerStrokeWidth: 8,
      titleColor:'#ffffff',
      subtitle: 'Match',
      outerStrokeColor: "#78C000",
      innerStrokeColor: "#C7E596",
      animationDuration: 300,
      
    }),
    HighchartsChartModule,
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    // PdfViewerModule,
    AppRoutingModule,
    FormsModule,
    HamletAnalysisComponent,
    PdfHighlighterComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
