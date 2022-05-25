all:
	tsc
default:
	find . -name "*.default.html" -print0 | awk -v RS="\0" -v ORS="\0" '{print $0;sub(/\.default.html$$/,".htm"); print $0; }' | xargs -0 -n 2 cp
	make all
anon:
	find . -name "*.anon.html" -print0 | awk -v RS="\0" -v ORS="\0" '{print $0;sub(/\.anon.html$$/,".htm"); print $0; }' | xargs -0 -n 2 cp
	cp -- "$f" "${f%.anon.html}.htm";
	done
	make all
install:
	sudo cp ./*.htm /var/www/html/
	sudo cp -r ./static /var/www/html/
	sudo cp ./.htaccess /var/www/html/
	cd backend/heaps/ && make && make install

clean:
	rm *.htm
	cd backend/heaps/ && make clean
