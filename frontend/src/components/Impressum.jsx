import "./css/Impressum.css";

function Impressum() {
  return (
    <div className="impressum-page">
      <div className="impressum">
        <h1>Impressum</h1>

        <section>
          <h2>Angaben gemäß § 5 TMG</h2>
          <p>
            Amon Wiechmann
            <br />
            Heisenbergstraße 2
            <br />
            48149 Münster
            <br />
            Deutschland
          </p>
        </section>

        <section>
          <h2>Kontakt</h2>
          <p>E-Mail: ajwiechmann@web.de</p>
        </section>

        <section>
          <h2>Verantwortlich für den Inhalt</h2>
          <p>Amon Wiechmann</p>
        </section>

        <section>
          <h2>Haftungsausschluss</h2>
          <p>
            Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für
            die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können
            wir jedoch keine Gewähr übernehmen.
          </p>
        </section>
      </div>
    </div>
  );
}

export default Impressum;
