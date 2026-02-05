/**
 * Import layer for translating device-specific file formats to domain model.
 *
 * <p>This package contains importers that parse raw activity data from different
 * swim tracking devices and translate it into the vendor-neutral domain model.
 *
 * <p>Supported formats:
 * <ul>
 *   <li>Garmin FIT - Binary format from Garmin Swim 2</li>
 *   <li>TCX - XML format from FORM Smart Swim 2</li>
 * </ul>
 *
 * <p>Key design principles:
 * <ul>
 *   <li>Importers only translate, they do NOT merge or align data</li>
 *   <li>Each importer creates complete {@link de.siefeucht.swimmerge.domain.model.SwimActivity} objects</li>
 *   <li>Activities are tagged with their source for later merge processing</li>
 * </ul>
 *
 * @see de.siefeucht.swimmerge.importer.ActivityImporter
 * @see de.siefeucht.swimmerge.importer.GarminFitImporter
 * @see de.siefeucht.swimmerge.importer.FormTcxImporter
 */
package de.siefeucht.swimmerge.importer;
