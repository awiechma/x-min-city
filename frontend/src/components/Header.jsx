import { Nav, Navbar, Container } from "react-bootstrap";
import { NavLink } from "react-router-dom";
import "./css/Header.css";

function Header() {
  return (
    <Navbar expand="lg" className="bg-body-tertiary">
      <Container>
        <Navbar.Brand
          as={NavLink}
          to="/"
          className="d-flex align-items-center gap-2"
        >
          <img src="/images/logo.png" alt="x-min-city logo" height="28" />
          <span>x-minute-city</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={NavLink} to="/reachmap">
              ReachMap
            </Nav.Link>
            <Nav.Link as={NavLink} to="/cityscope">
              CityScope
            </Nav.Link>
            <Nav.Link as={NavLink} to="/impressum">
              Impressum
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;
