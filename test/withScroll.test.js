import { expect } from 'chai';
import scrollLeft from 'dom-helpers/query/scrollLeft';
import scrollTop from 'dom-helpers/query/scrollTop';
import createBrowserHistory from 'history/lib/createBrowserHistory';
import createHashHistory from 'history/lib/createHashHistory';

import withScroll from '../src';

import {
  createHashHistoryWithoutKey,
  withRoutes,
  withScrollElement,
  withScrollElementRoutes,
} from './fixtures';
import run, { delay } from './run';

describe('withScroll', () => {
  [
    createBrowserHistory,
    createHashHistory,
    createHashHistoryWithoutKey,
  ].forEach(createHistory => {
    describe(createHistory.name, () => {
      let unlisten;

      afterEach(() => {
        if (unlisten) {
          unlisten();
        }
      });

      describe('default behavior', () => {
        it('should emulate browser scroll behavior', done => {
          const history = withRoutes(withScroll(createHistory()));

          unlisten = run(history, [
            () => {
              // This will be ignored, but will exercise the throttle logic.
              scrollTop(window, 10000);

              setTimeout(() => {
                scrollTop(window, 15000);
                delay(() => history.push('/detail'));
              });
            },
            () => {
              expect(scrollTop(window)).to.equal(0);
              scrollTop(window, 5000);
              delay(history.goBack);
            },
            location => {
              expect(location.state).to.not.exist;
              expect(scrollTop(window)).to.equal(15000);
              history.push('/detail');
            },
            () => {
              expect(scrollTop(window)).to.equal(0);
              done();
            },
          ]);
        });
      });

      describe('custom behavior', () => {
        it('should allow scroll suppression', done => {
          const history = withRoutes(
            withScroll(
              createHistory(),
              (prevLocation, location) => (
                !prevLocation || prevLocation.pathname !== location.pathname
              )
            )
          );

          unlisten = run(history, [
            () => {
              history.push('/detail');
            },
            () => {
              scrollTop(window, 5000);
              delay(() => history.push('/detail?key=value'));
            },
            () => {
              expect(scrollTop(window)).to.equal(5000);
              history.push('/');
            },
            () => {
              expect(scrollTop(window)).to.equal(0);
              done();
            },
          ]);
        });

        it('should allow custom position', done => {
          const history = withRoutes(withScroll(
            createHistory(), () => [10, 20]
          ));

          unlisten = run(history, [
            () => {
              history.push('/detail');
            },
            () => {
              history.push('/');
            },
            () => {
              expect(scrollLeft(window)).to.equal(10);
              expect(scrollTop(window)).to.equal(20);
              done();
            },
          ]);
        });

        it('should allow reading position', done => {
          let prevPosition;
          let position;

          function shouldUpdateScroll(prevLocation, location) {
            if (prevLocation) {
              prevPosition = this.readPosition(prevLocation);
            }

            position = this.readPosition(location);

            return true;
          }

          const history = withRoutes(withScroll(
            createHistory(), shouldUpdateScroll
          ));

          unlisten = run(history, [
            () => {
              scrollTop(window, 15000);
              delay(() => history.push('/detail'));
            },
            () => {
              expect(prevPosition).to.eql([0, 15000]);
              expect(position).to.not.exist;
              history.goBack();
            },
            () => {
              expect(prevPosition).to.eql([0, 0]);
              expect(position).to.eql([0, 15000]);
              done();
            },
          ]);
        });
      });

      describe('scroll element', () => {
        it('should follow browser scroll behavior', done => {
          const { container, ...history } = withScrollElement(
            withScroll(createHistory(), () => false)
          );

          unlisten = run(history, [
            () => {
              scrollTop(container, 10000);
              history.push('/other');
            },
            () => {
              expect(scrollTop(container)).to.equal(0);
              scrollTop(container, 5000);
              history.goBack();
            },
            () => {
              expect(scrollTop(container)).to.equal(10000);
              history.push('/other');
            },
            () => {
              expect(scrollTop(container)).to.equal(0);
              done();
            },
          ]);
        });

        it('should restore scroll on remount', done => {
          const { container, ...history } = withScrollElementRoutes(
            withScroll(createHistory(), () => false)
          );

          unlisten = run(history, [
            () => {
              scrollTop(container, 10000);
              history.push('/other');
            },
            () => {
              expect(container.scrollHeight).to.equal(100);
              expect(scrollTop(container)).to.equal(0);
              scrollTop(container, 5000);
              history.goBack();
            },
            () => {
              expect(container.scrollHeight).to.equal(20000);
              expect(scrollTop(container)).to.equal(10000);
              done();
            },
          ]);
        });
      });
    });
  });
});
