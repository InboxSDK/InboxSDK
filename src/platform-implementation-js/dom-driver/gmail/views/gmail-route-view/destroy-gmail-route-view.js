'use strict';

import Logger from '../../../../lib/logger';

export default function destroyGmailRouteView(gmailRouteView){
	//manual destruction
	let rowListViews = gmailRouteView.getRowListViews();
	if(rowListViews && rowListViews.length > 0){
		rowListViews.forEach((rowListView) => {
			try{
				rowListView.destroy();
			}
			catch(err){
				Logger.error(err, 'Failed to destroy rowListView');
			}
		});
	}

	let threadView = gmailRouteView.getThreadView();
	if(threadView){
		try{
			threadView.destroy();
		}
		catch(err){
			Logger.error(err, 'Failed to destroy threadView');
		}
	}

	let eventStream = gmailRouteView.getEventStream();
	if(eventStream){
		try{
			eventStream.end();
		}
		catch(err){
			Logger.error(err, 'Failed to end GmailRouteView eventStream');
		}
	}
}
