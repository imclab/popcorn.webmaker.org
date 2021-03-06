/*globals TogetherJS*/
define([ "WebmakerUI", "localized", "dialog/dialog", "util/lang", "l10n!/layouts/header.html", "ui/widget/textbox", "ui/widget/tooltip",
         "ui/widget/ProjectDetails", "util/togetherjs-syncer" ],
  function( WebmakerUI, Localized, Dialog, Lang, HEADER_TEMPLATE, TextBoxWrapper, ToolTip, ProjectDetails, TogetherJSSyncer ) {

  return function( butter, options ){

    options = options || {};

    var _this = this,
        _rootElement = Lang.domFragment( HEADER_TEMPLATE, ".butter-header" ),
        _saveContainer = _rootElement.querySelector( ".butter-save-container" ),
        _saveButton = _saveContainer.querySelector( ".butter-save-btn" ),
        _clearEvents = _rootElement.querySelector( ".butter-clear-events-btn" ),
        _removeProject = _rootElement.querySelector( ".butter-remove-project-btn" ),
        _previewContainer = _rootElement.querySelector( ".butter-preview-container" ),
        _previewBtn = _previewContainer.querySelector( ".butter-preview-btn" ),
        _makeDetails = _rootElement.querySelector( "#make-details" ),
        _loginToSaveTooltip, _loginToPreviewTooltip, _saveToPreviewTooltip,
        _projectDetails = new ProjectDetails( butter ),
        _togetherJS,
        _langSelector = _rootElement.querySelector( "#lang-picker" ),
        _togetherjsBtn = _rootElement.querySelector( ".together-toggle" ),
        _togetherJSSyncer;

    // URL redirector for language picker
    WebmakerUI.langPicker( _langSelector );

    _loginToSaveTooltip = ToolTip.create({
      title: "header-login-save-tooltip",
      message: Localized.get( "Login to save your project!" ),
      element: _saveContainer,
      top: "60px"
    });

    _loginToPreviewTooltip = ToolTip.create({
      title: "header-login-title-tooltip",
      message: Localized.get( "Login to preview your project!" ),
      element: _previewContainer,
      top: "60px"
    });

    _saveToPreviewTooltip = ToolTip.create({
      title: "header-login-title-tooltip",
      message: Localized.get( "Save to preview your project!" ),
      element: _previewContainer,
      top: "60px"
    });

    _this.element = _rootElement;

    // Feature flag might not be enabled.
    if ( _togetherjsBtn ) {
      _togetherJSSyncer = new TogetherJSSyncer( butter );

      var toggleTogether = function( started ) {
        return function() {
          _togetherjsBtn.innerHTML = started ? Localized.get( "Go it alone" ) : Localized.get( "Collaborate" );
        };
      };

      TogetherJS.on( "ready", toggleTogether( true ) );
      TogetherJS.on( "close", toggleTogether( false ) );

      _togetherjsBtn.addEventListener( "click", function() {
        _togetherJS = new TogetherJS( this );
      });

      if ( TogetherJS.running ) {
        toggleTogether( true )();
      }
    }

    function showErrorDialog( message ) {
      var dialog = Dialog.spawn( "error-message", {
        data: message,
        events: {
          cancel: function() {
            dialog.close();
          }
        }
      });
      dialog.open();
    }

    function afterSave() {
      openProjectEditor();
      togglePreviewButton( true );
      toggleDeleteProject( true );
    }

    function submitSave() {
      toggleSaveButton( false );

      butter.project.save(function( e ) {
        if ( e.error === "okay" ) {
          afterSave();
          return;
        } else {
          toggleSaveButton( true );
          togglePreviewButton( false );
          butter.project.useBackup();
          showErrorDialog( Localized.get( "There was a problem saving your project" ) );
        }
      });
    }

    function saveProject() {
      if ( butter.project.isSaved ) {
        return;
      } else if ( !butter.project.id ) {
        toggleSaveButton( false );
        _makeDetails.classList.remove( "butter-hidden" );
        _projectDetails.open();
      } else {
        submitSave();
      }
    }

    function openProjectEditor() {
      butter.editor.openEditor( "project-editor" );
    }

    function toggleSaveButton( on ) {
      if ( on ) {
        _saveButton.classList.remove( "butter-disabled" );
        _saveButton.addEventListener( "click", saveProject, false );
      } else {
        _saveButton.classList.add( "butter-disabled" );
        _saveButton.removeEventListener( "click", saveProject, false );
      }
    }

    function togglePreviewButton( on ) {
      if ( on ) {
        _saveToPreviewTooltip.hidden = true;
        _previewBtn.classList.remove( "butter-disabled" );
        _previewBtn.href = butter.project.publishUrl;
        _previewBtn.onclick = function() {
          return true;
        };
      } else {
        _saveToPreviewTooltip.hidden = !butter.cornfield.authenticated();
        _previewBtn.classList.add( "butter-disabled" );
        _previewBtn.href = "";
        _previewBtn.onclick = function() {
          return false;
        };
      }
    }

    function toggleTooltips( saved ) {
      _loginToPreviewTooltip.hidden = saved;
      _loginToSaveTooltip.hidden = saved;
    }

    function removeProject() {
      var dialog;
      if ( butter.project.id && butter.project.isSaved ) {
        dialog = Dialog.spawn( "remove-project", {
          data: {
            callback: function() {
              butter.project.remove(function( e ) {

                if ( e.error === "okay" ) {
                  window.onbeforeunload = null;
                  window.history.replaceState( {}, "", "/" + Localized.getCurrentLang() + "/editor/" );
                  window.location.reload();
                } else {
                  showErrorDialog( Localized.get( "There was a problem saving your project" ) );
                }
              });
            }
          }
        });
        dialog.open();
      }
    }

    function toggleDeleteProject( state ) {
      if ( state ) {
        _removeProject.addEventListener( "click", removeProject, false );
        _removeProject.classList.remove( "butter-disabled" );
      } else {
        _removeProject.removeEventListener( "click", removeProject, false );
        _removeProject.classList.add( "butter-disabled" );
      }
    }

    function clearEventsClick() {
      var dialog;
      if ( butter.currentMedia && butter.currentMedia.hasTrackEvents() ) {
        dialog = Dialog.spawn( "delete-track-events", {
          data: butter
        });
        dialog.open();
      }
    }

    this.views = {
      dirty: function() {
        togglePreviewButton( false );
        toggleSaveButton( butter.cornfield.authenticated() );
      },
      clean: function() {
        togglePreviewButton( true );
        toggleSaveButton( false );
      },
      login: function() {
        var isSaved = butter.project.isSaved;

        toggleTooltips( butter.cornfield.authenticated() );
        togglePreviewButton( isSaved );
        toggleSaveButton( !isSaved && butter.cornfield.authenticated() );
        toggleDeleteProject( isSaved && butter.cornfield.authenticated() );
      },
      logout: function() {
        togglePreviewButton( false );
        toggleSaveButton( false );
        toggleTooltips( false );
      }
    };

    this.attachToDOM = function() {
      document.body.classList.add( "butter-header-spacing" );
      document.body.insertBefore( _rootElement, document.body.firstChild );
    };

    butter.listen( "authenticated", _this.views.login, false );
    butter.listen( "logout", _this.views.logout, false );

    butter.listen( "projectsaved", function() {
      // Disable "Save" button
      _this.views.clean();
      toggleDeleteProject( true );
    });

    butter.listen( "projectchanged", function() {
      // Re-enable "Save" button to indicate things are not saved
      _this.views.dirty();
    });

    butter.listen( "ready", function() {

      if ( !butter.cornfield.authenticated() ) {
        toggleTooltips( false );
        togglePreviewButton( false );
        toggleSaveButton( false );
        toggleDeleteProject( false );
      }

      _projectDetails.title( _makeDetails.querySelector( "[name='title']" ) );
      _projectDetails.thumbnail( _makeDetails.querySelector( "[name='thumbnail']" ) );
      _projectDetails.tags( _makeDetails.querySelector( "[name='tags']" ) );
      _projectDetails.description( _makeDetails.querySelector( "[name='description']" ) );
      _projectDetails.buttons( _makeDetails.querySelector( "[name='buttons']" ), function( save ) {
        if ( save ) {
          submitSave();
        }

        _makeDetails.classList.add( "butter-hidden" );
        toggleSaveButton( true );
        togglePreviewButton( false );
        toggleTooltips( true );
      });

      _clearEvents.addEventListener( "click", clearEventsClick, false );
    });
  };
});
