import "./css/LandingPage.css";

export default function LandingPage() {
  return (
    <div className="lp">
      <header className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <h1 className="lp-title">
              Die x-Minuten-Stadt am Beispiel Remscheid
            </h1>
            <p className="lp-subtitle">
              Webbasierte, interaktive Analyse der{" "}
              <b>bevölkerungsbezogenen Erreichbarkeit</b> zentraler
              Alltagsfunktionen. Ausgewertet werden Fuß- und Radverkehr auf 100m
              x 100m oder Stadteilebene.
            </p>

            <div className="lp-cta">
              <a className="lp-btn lp-btn-primary" href="/cityscope">
                Zur Analyse starten
              </a>
              <a className="lp-btn lp-btn-ghost" href="#methodik">
                Methodik & Daten
              </a>
            </div>
            {window.location.hostname === "x-min-city.com" && (
              <div className="lp-warning-box" role="alert">
                <div className="lp-warning-title">
                  Hinweis zur Serverleistung
                </div>
                <p className="lp-warning-text">
                  Die Anwendung wird derzeit auf einem privat betriebenen Server
                  ausgeführt. Aufgrund der begrenzten Serverressourcen sind
                  aktuell nur kleinere Analysebereiche sinnvoll nutzbar. Sehr
                  große Bounding-Boxen (z. B. das gesamte Stadtgebiet
                  Remscheids) können zu langen Rechenzeiten oder Abbrüchen
                  führen.
                </p>
              </div>
            )}
          </div>

          <div className="lp-hero-card lp-hero-preview" aria-hidden="true">
            <div className="lp-card-top">
              <div className="lp-window-dots">
                <span />
                <span />
                <span />
              </div>
              <div className="lp-card-title">Vorschau</div>
            </div>
            <div className="lp-map-screenshot">
              <img
                src="/images/cityscope-preview.png"
                alt="Vorschau der x-Minuten-Stadt Analyse für Remscheid"
              />
            </div>
          </div>
        </div>

        <div className="lp-hero-wave" aria-hidden="true" />
      </header>

      <main className="lp-main">
        <section
          className="lp-section lp-section-cards"
          aria-label="Kurz erklärt"
        >
          <div className="lp-container">
            <h2 className="lp-h2">Kurz erklärt</h2>
            <p className="lp-lead">
              Die Anwendung visualisiert Erreichbarkeit als Reisezeit und fasst
              sie zu verständlichen Kennzahlen zusammen.
            </p>

            <div className="lp-cards">
              <div className="lp-card">
                <h3>Was macht die Anwendung?</h3>
                <ul>
                  <li>
                    Kombination aus individueller Erreichbarkeitsanalyse und
                    stadtweiter Bewertung
                  </li>
                  <li>
                    Zwei integrierte Ansichten: ReachMap für lokale Reichweiten
                    und CityScope für das Gesamtstadtbild
                  </li>
                  <li>
                    Direkter Wechsel zwischen Standortperspektive und
                    aggregierter Stadtanalyse
                  </li>
                </ul>
              </div>

              <div className="lp-card">
                <h3>Wie wird bewertet?</h3>
                <ul>
                  <li>
                    Coverage-Score: Anteil der Bevölkerung, der innerhalb der
                    Zeitschwelle alle Kategorien erreicht.
                  </li>
                  <li>Median-Reisezeit der Bevölkerung zu allen Kategorien</li>
                  <li>Stadtweite und stadtteilweise Aggregation</li>
                </ul>
              </div>

              <div className="lp-card">
                <h3>Szenarien & Simulation</h3>
                <ul>
                  <li>
                    Interaktives Hinzufügen neuer Einrichtungen (z. B.
                    Supermärkte, Schulen)
                  </li>
                  <li>
                    Simulation von Wegfallszenarien durch gezieltes Entfernen
                    bestehender POIs
                  </li>
                  <li>
                    Unmittelbare Neuberechnung von Erreichbarkeit,
                    Coverage-Score und Reisezeiten
                  </li>
                </ul>
              </div>
            </div>

            <div className="lp-inline-cta">
              <a className="lp-btn lp-btn-primary" href="/reachmap">
                Lokale Erreichbarkeit öffnen
              </a>
              <a className="lp-btn lp-btn-primary" href="/cityscope">
                Stadtweite-Analyse öffnen
              </a>
            </div>
          </div>
        </section>

        <section
          className="lp-section"
          id="szenario"
          aria-label="Szenario Modus"
        >
          <div className="lp-container lp-split">
            <div>
              <h2 className="lp-h2">Szenarien simulieren</h2>
              <p className="lp-lead">
                Platziere neue Einrichtungen oder entferne bestehende POIs und
                sieh unmittelbar, wie sich Coverage-Score und Reisezeiten
                verändern.
              </p>

              <div className="lp-feature-list">
                <div className="lp-feature">
                  <div className="lp-feature-icon">+</div>
                  <div>
                    <div className="lp-feature-title">POIs hinzufügen</div>
                    <div className="lp-feature-text">
                      Kategorie wählen, auf die Karte klicken, direkt
                      vergleichen.
                    </div>
                  </div>
                </div>

                <div className="lp-feature">
                  <div className="lp-feature-icon">−</div>
                  <div>
                    <div className="lp-feature-title">POIs entfernen</div>
                    <div className="lp-feature-text">
                      Wegfall-Szenarien testen (z. B. Schließungen oder
                      Verlagerungen).
                    </div>
                  </div>
                </div>

                <div className="lp-feature">
                  <div className="lp-feature-icon">↻</div>
                  <div>
                    <div className="lp-feature-title">
                      Sofortige Neuberechnung
                    </div>
                    <div className="lp-feature-text">
                      Kennzahlen aktualisieren sich nach dem Start der Analyse.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section" id="tutorials" aria-label="Tutorials">
          <div className="lp-container lp-split">
            <div>
              <h2 className="lp-h2">Tutorials</h2>
              <p className="lp-lead">
                Kurze Schritt-für-Schritt-Anleitungen für ReachMap (lokal) und
                CityScope (stadtweit) – inkl. Tipps für sinnvolle Parameter und
                schnelle Berechnungen.
              </p>

              <div className="lp-feature-list" style={{ marginTop: 18 }}>
                <h3 className="lp-h3" style={{ marginBottom: 10 }}>
                  ReachMap: lokale Erreichbarkeit
                </h3>

                <div className="lp-feature">
                  <div className="lp-feature-icon">1</div>
                  <div>
                    <div className="lp-feature-title">Standort wählen</div>
                    <div className="lp-feature-text">
                      Öffne ReachMap und klicke auf die Karte, um deinen
                      Startpunkt zu setzen (z. B. Wohnort, Haltestelle,
                      Quartierszentrum).
                    </div>
                  </div>
                </div>

                <div className="lp-feature">
                  <div className="lp-feature-icon">2</div>
                  <div>
                    <div className="lp-feature-title">
                      Modus & Zeitschwelle einstellen
                    </div>
                    <div className="lp-feature-text">
                      Wähle Fuß oder Fahrrad und setze eine Zeitschwelle (z. B.
                      10/15 Minuten). Damit definierst du die maximale
                      Reisezeit.
                    </div>
                  </div>
                </div>

                <div className="lp-feature">
                  <div className="lp-feature-icon">3</div>
                  <div>
                    <div className="lp-feature-title">Kategorien prüfen</div>
                    <div className="lp-feature-text">
                      Aktiviere die relevanten POI-Kategorien (z. B. Versorgung,
                      Gesundheit, Bildung).
                    </div>
                  </div>
                </div>

                <div className="lp-feature">
                  <div className="lp-feature-icon">4</div>
                  <div>
                    <div className="lp-feature-title">Berechnung starten</div>
                    <div className="lp-feature-text">
                      Die Karte zeigt erreichbare Ziele innerhalb der Zeit.
                    </div>
                  </div>
                </div>
              </div>

              <div className="lp-feature-list" style={{ marginTop: 26 }}>
                <h3 className="lp-h3" style={{ marginBottom: 10 }}>
                  CityScope: stadtweite Analyse
                </h3>

                <div className="lp-feature">
                  <div className="lp-feature-icon">1</div>
                  <div>
                    <div className="lp-feature-title">
                      Analysebereich festlegen
                    </div>
                    <div className="lp-feature-text">
                      Öffne CityScope und ziehe, mithilfe des Tools oben links,
                      eine Bounding-Box auf. Starte mit einem kleineren Bereich
                      (z. B. ein Stadtteil), um schnelle Ergebnisse zu bekommen.
                    </div>
                  </div>
                </div>

                <div className="lp-feature">
                  <div className="lp-feature-icon">2</div>
                  <div>
                    <div className="lp-feature-title">Ebene wählen</div>
                    <div className="lp-feature-text">
                      Entscheide zwischen 100×100-m-Raster (detailreich) oder
                      Stadtteil- Aggregation (übersichtlich, schneller zu
                      lesen).
                    </div>
                  </div>
                </div>

                <div className="lp-feature">
                  <div className="lp-feature-icon">3</div>
                  <div>
                    <div className="lp-feature-title">Parameter setzen</div>
                    <div className="lp-feature-text">
                      Wähle Modus (Fuß/Rad), Zeitschwelle und Kategorien.
                    </div>
                  </div>
                </div>

                <div className="lp-feature">
                  <div className="lp-feature-icon">4</div>
                  <div>
                    <div className="lp-feature-title">
                      Analyse starten & Kennzahlen lesen
                    </div>
                    <div className="lp-feature-text">
                      Starte die Berechnung. Prüfe anschließend Coverage-Score
                      und Median-Reisezeit.
                    </div>
                  </div>
                </div>

                <div className="lp-feature">
                  <div className="lp-feature-icon">5</div>
                  <div>
                    <div className="lp-feature-title">Szenario testen</div>
                    <div className="lp-feature-text">
                      Füge mithilfe des Szenario-Modus (unten recthts) POIs
                      hinzu oder entferne bestehende, um Maßnahmen (z. B. neue
                      Nahversorgung) oder Wegfälle zu simulieren. Danach neu
                      berechnen und Werte vergleichen.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="lp-section"
          id="methodik"
          aria-label="Methodik und Daten"
        >
          <div className="lp-container">
            <h2 className="lp-h2">Methodik & Daten</h2>
            <p className="lp-lead">
              Die Analyse basiert auf Routing im OpenStreetMap-Netzwerk und
              aggregiert Reisezeiten bevölkerungsgewichtet auf Raster- und
              Stadtteil-Ebene.
            </p>

            <div className="lp-method-grid">
              <div className="lp-method">
                <div className="lp-method-k">Routing</div>
                <div className="lp-method-v">
                  R5 / r5py, OpenStreetMap-Wegenetz
                </div>
              </div>
              <div className="lp-method">
                <div className="lp-method-k">Bevölkerung</div>
                <div className="lp-method-v">Zensus 2022, 100×100 m Raster</div>
                <div className="lp-method-v">Stadtteile Remscheid</div>
              </div>
              <div className="lp-method">
                <div className="lp-method-k">POIs</div>
                <div className="lp-method-v">OpenStreetMap</div>
              </div>
              <div className="lp-method">
                <div className="lp-method-k">Kennzahlen</div>
                <div className="lp-method-v">
                  Coverage-Score & Median-Reisezeit
                </div>
              </div>
              <div className="lp-method">
                <div className="lp-method-k">Aggregation</div>
                <div className="lp-method-v">
                  bevölkerungsgewichtet (Raster → Stadtteile)
                </div>
              </div>
              <div className="lp-method">
                <div className="lp-method-k">Transparenz</div>
                <div className="lp-method-v">
                  Parameter (Schwelle, Kategorien, Modus) nachvollziehbar
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="lp-section lp-section-footer-cta"
          aria-label="Call to action"
        >
          <div className="lp-container lp-footer-cta">
            <div>
              <h2 className="lp-h2">Direkt zur Stadtanalyse</h2>
              <p className="lp-lead">
                Setze einen Analysebereich, wähle Kategorien und starte die
                Berechnung.
              </p>
            </div>
            <a className="lp-btn lp-btn-primary lp-btn-lg" href="/cityscope">
              Zur Analyse
            </a>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-left">
            <div className="lp-footer-title">x-Minuten-Stadt Remscheid</div>
            <div className="lp-footer-sub">
              Bachelorarbeit · Universität Münster · Institut für Geoinformatik
            </div>
          </div>
          <div className="lp-footer-right mt-3">
            <a className="lp-btn lp-btn-ghost lp-btn-lg" href="/impressum">
              Impressum
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
