import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HamletAnalysisComponent } from './hamlet-analysis';

/**
 * Two independent research projects:
 *   /hamlet-analysis  — Hamlet Translation Analysis v1.5 (unchanged, eagerly loaded as before)
 *   /heidi-analysis   — Heidi Translation Analysis v1.0 (lazy-loaded standalone component;
 *                       its dataset is fetched only when this route is opened)
 * The empty path keeps opening Hamlet, so the existing GitHub Pages URL behaves as before.
 */
export const APP_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'hamlet-analysis' },
  { path: 'hamlet-analysis', component: HamletAnalysisComponent, title: 'Hamlet Translation Analysis v1.5' },
  {
    path: 'heidi-analysis',
    loadComponent: () => import('./heidi-analysis/heidi-analysis.component').then(m => m.HeidiAnalysisComponent),
    title: 'Heidi Translation Analysis v1.0',
  },
  { path: '**', redirectTo: 'hamlet-analysis' },
];

@NgModule({
  imports: [RouterModule.forRoot(APP_ROUTES)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
