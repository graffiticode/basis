/* Copyright (c) 2021, ARTCOMPILER INC */
import * as React from 'react';
import * as d3 from 'd3';
import './style.css';
export class Viewer extends React.Component {
  componentDidMount() {
    d3.select('#graff-view').append('div').classed('done-rendering', true);
  }
  renderElements(data) {
    const elts = [];
    data.forEach(d => {
      elts.push(d);
    });
    return elts;
  }
  render() {
    const props = this.props;
    const data = props.obj && [].concat(props.obj) || [];
    const elts = this.renderElements(data);
    return (
      <div>{elts}</div>
    );
  }
};
