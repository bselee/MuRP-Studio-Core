import { PackagingTemplate } from '../types';

export const PACKAGING_TEMPLATES: PackagingTemplate[] = [
  {
    id: 'pouch-standup-12oz',
    name: 'Stand-up Pouch (12oz)',
    category: 'Flexible',
    dimensions: '6" x 9" x 3"',
    aspectRatio: '3:4',
    promptContext: 'photorealistic stand-up pouch, resealable zipper top, matte finish plastic material, 3D rendering studio lighting'
  },
  {
    id: 'pouch-flat-sample',
    name: 'Flat Sample Sachet',
    category: 'Flexible',
    dimensions: '3" x 5"',
    aspectRatio: '2:3',
    promptContext: 'flat metallic foil sample sachet, tear notch visible, top down view'
  },
  {
    id: 'can-sleek-12oz',
    name: 'Sleek Aluminum Can (12oz)',
    category: 'Rigid',
    dimensions: '2.25" x 6"',
    aspectRatio: '1:2',
    promptContext: 'tall sleek 12oz aluminum beverage can, condensation droplets, cold metallic texture, cylinder projection'
  },
  {
    id: 'can-std-12oz',
    name: 'Standard Can (12oz)',
    category: 'Rigid',
    dimensions: '2.6" x 4.8"',
    aspectRatio: '3:4',
    promptContext: 'standard 355ml aluminum soda can, glossy finish, studio background'
  },
  {
    id: 'carton-retail',
    name: 'Retail Folding Carton',
    category: 'Carton',
    dimensions: '4" x 2" x 6"',
    aspectRatio: '3:4',
    promptContext: 'paperboard folding carton box, retail shelf ready, sharp edges, slight perspective angle'
  },
  {
    id: 'bottle-glass-750',
    name: 'Glass Bottle (750ml)',
    category: 'Rigid',
    dimensions: '3" x 11"',
    aspectRatio: '1:3',
    promptContext: '750ml glass bottle, wine style, paper texture label applied, elegant lighting'
  },
  {
    id: 'label-jar-rd',
    name: 'Round Jar Label',
    category: 'Label',
    dimensions: '3" x 8" (Wrap)',
    aspectRatio: '3:2',
    promptContext: 'rectangular label design wrapped around a glass jar, visible curvature'
  }
];

export const templateService = {
  getTemplates: () => PACKAGING_TEMPLATES,
  getTemplateById: (id: string) => PACKAGING_TEMPLATES.find(t => t.id === id)
};